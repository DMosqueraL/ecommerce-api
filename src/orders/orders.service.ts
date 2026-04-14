import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { UpdateStatusDto } from './dto/update-status.dto';
import { PaymentMethod, OrderStatus } from '../../generated/prisma/enums';
import type { Product } from '../../generated/prisma/client';

const ITEMS_INCLUDE = { items: { include: { product: true } } };

export interface OrderFilters {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  async create(userId: number, dto: CreateOrderDto) {
    // Bonus: agrupar items duplicados por productId (quantity suma, discountPercent = máximo)
    const groupedMap = new Map<
      number,
      { quantity: number; discountPercent: number }
    >();
    for (const item of dto.items) {
      const existing = groupedMap.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.discountPercent = Math.max(
          existing.discountPercent,
          item.discountPercent ?? 0,
        );
      } else {
        groupedMap.set(item.productId, {
          quantity: item.quantity,
          discountPercent: item.discountPercent ?? 0,
        });
      }
    }
    const groupedItems = Array.from(groupedMap.entries()).map(
      ([productId, data]) => ({
        productId,
        ...data,
      }),
    );

    return this.prisma.$transaction(async (tx) => {
      const itemsData: Array<{
        productId: number;
        quantity: number;
        price: number;
        discountPercent: number;
        discountAmount: number;
        finalPrice: number;
        subtotal: number;
      }> = [];
      let totalAmount = 0;

      for (const item of groupedItems) {
        // Bug #3: lock pesimista antes de cualquier validación
        const rows = await tx.$queryRaw<Product[]>`
          SELECT * FROM "Product" WHERE id = ${item.productId} FOR UPDATE
        `;
        const product = rows[0];

        // Validaciones después del lock (no antes)
        if (!product)
          throw new NotFoundException(
            `Producto con id ${item.productId} no encontrado`,
          );
        if (product.stock < item.quantity)
          throw new BadRequestException(
            `Stock insuficiente para el producto "${product.name}". Disponible: ${product.stock}, solicitado: ${item.quantity}`,
          );

        // Cálculo por item
        const price = product.price;
        const discountPercent = item.discountPercent;
        const discountAmount = (price * discountPercent) / 100;
        const finalPrice = price - discountAmount;
        const subtotal = finalPrice * item.quantity;
        totalAmount += subtotal;

        itemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          price,
          discountPercent,
          discountAmount,
          finalPrice,
          subtotal,
        });
      }

      // Totales de la orden
      const taxAmount = totalAmount * 0.19;
      const shippingCost =
        dto.paymentMethod === PaymentMethod.CONTRA_ENTREGA ? 20000 : 15000;
      const grandTotal = totalAmount + taxAmount + shippingCost;

      // Crear la orden con sus items anidados
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          taxAmount,
          shippingCost,
          grandTotal,
          shippingAddress: dto.shippingAddress,
          billingAddress: dto.billingAddress,
          paymentMethod: dto.paymentMethod,
          shippingCompany: dto.shippingCompany,
          trackingNumber: dto.trackingNumber,
          carrierPhone: dto.carrierPhone,
          items: { create: itemsData },
        },
        include: ITEMS_INCLUDE,
      });

      // Bug #1: descontar stock atómicamente con decrement
      for (const item of groupedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return order;
    });
  }

  private buildWhere(filters: OrderFilters & { userId?: number }) {
    const { status, paymentMethod, startDate, endDate, userId } = filters;
    return {
      ...(userId !== undefined && { userId }),
      ...(status !== undefined && { status }),
      ...(paymentMethod !== undefined && { paymentMethod }),
      ...(startDate !== undefined || endDate !== undefined
        ? {
            createdAt: {
              ...(startDate !== undefined && { gte: new Date(startDate) }),
              ...(endDate !== undefined && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters: OrderFilters & { userId?: number } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = this.buildWhere(filters);
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: ITEMS_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findMine(
    userId: number,
    page: number = 1,
    limit: number = 10,
    filters: OrderFilters = {},
  ) {
    const skip = (page - 1) * limit;
    const where = this.buildWhere({ ...filters, userId });
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: ITEMS_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, requesterId: number, requesterRole: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ITEMS_INCLUDE,
    });
    if (!order)
      throw new NotFoundException(`Pedido con id ${id} no encontrado`);
    if (requesterRole !== 'ADMIN' && order.userId !== requesterId)
      throw new ForbiddenException('No tienes permisos para ver este pedido');
    return order;
  }

  async updateStatus(id: number, dto: UpdateStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order)
      throw new NotFoundException(`Pedido con id ${id} no encontrado`);

    const currentStatus = order.status;
    const newStatus = dto.status;

    // Bug #5: validar transición con la máquina de estados
    const validNext = this.VALID_TRANSITIONS[currentStatus];
    if (!validNext.includes(newStatus)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de ${currentStatus} a ${newStatus}`,
      );
    }

    // Bug #4: cancelación devuelve stock en la misma transacción
    if (newStatus === OrderStatus.CANCELLED) {
      return this.prisma.$transaction(async (tx) => {
        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        return tx.order.update({
          where: { id },
          data: { status: newStatus },
          include: ITEMS_INCLUDE,
        });
      });
    }

    // Transición no destructiva: simple update fuera de transacción
    return this.prisma.order.update({
      where: { id },
      data: { status: newStatus },
      include: ITEMS_INCLUDE,
    });
  }
}
