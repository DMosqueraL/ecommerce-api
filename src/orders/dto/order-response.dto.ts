import { ApiProperty } from '@nestjs/swagger';
import type { OrderStatus, PaymentMethod } from '../../../generated/prisma/enums';
import { OrderItemResponseDto } from './order-item-response.dto';

type OrderWithItems = {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  shippingCost: number;
  taxAmount: number;
  grandTotal: number;
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: PaymentMethod;
  shippingCompany: string;
  trackingNumber: string;
  carrierPhone: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: number;
    productId: number;
    product: { name: string };
    quantity: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
    finalPrice: number;
    subtotal: number;
  }>;
};

export class OrderResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] })
  status: OrderStatus;

  @ApiProperty({ example: 3000000 })
  totalAmount: number;

  @ApiProperty({ example: 15000 })
  shippingCost: number;

  @ApiProperty({ example: 570000 })
  taxAmount: number;

  @ApiProperty({ example: 3585000 })
  grandTotal: number;

  @ApiProperty({ example: 'Calle 123 # 45-67, Bogotá' })
  shippingAddress: string;

  @ApiProperty({ example: 'Calle 123 # 45-67, Bogotá' })
  billingAddress: string;

  @ApiProperty({ example: 'TARJETA', enum: ['TARJETA', 'TRANSFERENCIA', 'CONTRA_ENTREGA'] })
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'Servientrega' })
  shippingCompany: string;

  @ApiProperty({ example: 'TRK123456' })
  trackingNumber: string;

  @ApiProperty({ example: '+57 300 000 0000' })
  carrierPhone: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: () => OrderItemResponseDto, isArray: true })
  items: OrderItemResponseDto[];

  constructor(order: OrderWithItems) {
    this.id = order.id;
    this.status = order.status;
    this.totalAmount = order.totalAmount;
    this.shippingCost = order.shippingCost;
    this.taxAmount = order.taxAmount;
    this.grandTotal = order.grandTotal;
    this.shippingAddress = order.shippingAddress;
    this.billingAddress = order.billingAddress;
    this.paymentMethod = order.paymentMethod;
    this.shippingCompany = order.shippingCompany;
    this.trackingNumber = order.trackingNumber;
    this.carrierPhone = order.carrierPhone;
    this.createdAt = order.createdAt;
    this.updatedAt = order.updatedAt;
    this.items = order.items.map((item) => new OrderItemResponseDto(item));
  }
}
