import { ApiProperty } from '@nestjs/swagger';

type ProductBasic = {
  id: number;
  name: string;
  price: number;
  stock: number;
};

export class ProductBasicDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Laptop Lenovo IdeaPad' })
  name: string;

  @ApiProperty({ example: 2500000 })
  price: number;

  @ApiProperty({ example: 10 })
  stock: number;

  constructor(product: ProductBasic) {
    this.id = product.id;
    this.name = product.name;
    this.price = product.price;
    this.stock = product.stock;
  }
}
