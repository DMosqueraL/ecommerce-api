import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { UpdateStatusDto } from './dto/update-status.dto';
import { PaymentMethod } from '../../generated/prisma/enums';

const ITEMS_INCLUDE = { items: { include: { product: true } } };

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

    // Calculate amounts
    const itemsData = dto.items.map((item, i) => {
      const unitPrice = products[i].price;
      const subtotal = unitPrice * item.quantity;
      return { productId: item.productId, quantity: item.quantity, unitPrice, subtotal };
    });

    const totalAmount = itemsData.reduce((sum, i) => sum + i.subtotal, 0);
    const taxAmount = totalAmount * 0.19;
    const shippingCost = dto.paymentMethod === PaymentMethod.CONTRA_ENTREGA ? 20000 : 15000;
    const grandTotal = totalAmount + taxAmount + shippingCost;

    return this.prisma.$transaction(async (tx) => {
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
      return order;
    });
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({ skip, take: limit, include: ITEMS_INCLUDE }),
      this.prisma.order.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findMine(userId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where = { userId };
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
