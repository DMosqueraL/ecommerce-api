import { ApiProperty } from '@nestjs/swagger';
import { ProductBasicDto } from '../../products/dto/product-basic.dto';

type CategoryWithProducts = {
  id: number;
  name: string;
  products: { id: number; name: string; price: number; stock: number }[];
};

export class CategoryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Electrónica' })
  name: string;

  @ApiProperty({ type: () => ProductBasicDto, isArray: true })
  products: ProductBasicDto[];

  constructor(category: CategoryWithProducts) {
    this.id = category.id;
    this.name = category.name;
    this.products = category.products.map((p) => new ProductBasicDto(p));
  }
}
