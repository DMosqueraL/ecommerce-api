import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { UpdateStatusDto } from './dto/update-status.dto';
import { PaymentMethod, OrderStatus } from '../../generated/prisma/enums';

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

  async create(userId: number, dto: CreateOrderDto) {
    // Validate products and stock
    const products = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundException(`Producto con id ${item.productId} no encontrado`);
        if (product.stock < item.quantity)
          throw new BadRequestException(
            `Stock insuficiente para el producto "${product.name}". Disponible: ${product.stock}`,
          );
        return product;
      }),
    );

    // Calculate amounts with optional discount
    const itemsData = dto.items.map((item, i) => {
      const price = products[i].price;
      const discountPercent = item.discountPercent ?? 0;
      const discountAmount = price * discountPercent / 100;
      const finalPrice = price - discountAmount;
      const subtotal = finalPrice * item.quantity;
      return { productId: item.productId, quantity: item.quantity, price, discountPercent, discountAmount, finalPrice, subtotal };
    });

    const totalAmount = itemsData.reduce((sum, i) => sum + i.subtotal, 0);
    const taxAmount = totalAmount * 0.19;
    const shippingCost = dto.paymentMethod === PaymentMethod.CONTRA_ENTREGA ? 20000 : 15000;
    const grandTotal = totalAmount + taxAmount + shippingCost;

    return this.prisma.$transaction(async (tx) => {
      return tx.order.create({
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

  async findAll(page: number = 1, limit: number = 10, filters: OrderFilters & { userId?: number } = {}) {
    const skip = (page - 1) * limit;
    const where = this.buildWhere(filters);
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take: limit, include: ITEMS_INCLUDE }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findMine(userId: number, page: number = 1, limit: number = 10, filters: OrderFilters = {}) {
    const skip = (page - 1) * limit;
    const where = this.buildWhere({ ...filters, userId });
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take: limit, include: ITEMS_INCLUDE }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, requesterId: number, requesterRole: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ITEMS_INCLUDE });
    if (!order) throw new NotFoundException(`Pedido con id ${id} no encontrado`);
    if (requesterRole !== 'ADMIN' && order.userId !== requesterId)
      throw new ForbiddenException('No tienes permisos para ver este pedido');
    return order;
  }

  async updateStatus(id: number, dto: UpdateStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Pedido con id ${id} no encontrado`);
    return this.prisma.order.update({ where: { id }, data: { status: dto.status }, include: ITEMS_INCLUDE });
  }
}
