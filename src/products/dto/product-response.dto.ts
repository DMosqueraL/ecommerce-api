import { ApiProperty } from '@nestjs/swagger';
import { CategoryBasicDto } from '../../categories/dto/category-basic.dto';

type ProductWithCategory = {
  id: number;
  name: string;
  description: string;
  stock: number;
  price: number;
  categoryId: number;
  category: { id: number; name: string };
};

export class ProductResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Laptop Lenovo IdeaPad' })
  name: string;

  @ApiProperty({ example: 'Laptop de 15 pulgadas con procesador Intel Core i5' })
  description: string;

  @ApiProperty({ example: 10 })
  stock: number;

  @ApiProperty({ example: 2500000 })
  price: number;

  @ApiProperty({ example: 1 })
  categoryId: number;

  @ApiProperty({ type: () => CategoryBasicDto })
  category: CategoryBasicDto;

  constructor(product: ProductWithCategory) {
    this.id = product.id;
    this.name = product.name;
    this.description = product.description;
    this.stock = product.stock;
    this.price = product.price;
    this.categoryId = product.categoryId;
    this.category = new CategoryBasicDto(product.category);
  }
}
