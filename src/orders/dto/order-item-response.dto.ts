import { ApiProperty } from '@nestjs/swagger';

type OrderItemWithProduct = {
  id: number;
  productId: number;
  product: { name: string };
  quantity: number;
  price: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  subtotal: number;
};

export class OrderItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  productId: number;

  @ApiProperty({ example: 'Laptop Lenovo IdeaPad' })
  productName: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 1500000 })
  price: number;

  @ApiProperty({ example: 0 })
  discountPercent: number;

  @ApiProperty({ example: 0 })
  discountAmount: number;

  @ApiProperty({ example: 1500000 })
  finalPrice: number;

  @ApiProperty({ example: 3000000 })
  subtotal: number;

  constructor(item: OrderItemWithProduct) {
    this.id = item.id;
    this.productId = item.productId;
    this.productName = item.product.name;
    this.quantity = item.quantity;
    this.price = item.price;
    this.discountPercent = item.discountPercent;
    this.discountAmount = item.discountAmount;
    this.finalPrice = item.finalPrice;
    this.subtotal = item.subtotal;
  }
}
