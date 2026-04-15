import { ApiProperty } from '@nestjs/swagger';

type CategoryBasic = {
  id: number;
  name: string;
};

export class CategoryBasicDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Electrónica' })
  name: string;

  constructor(category: CategoryBasic) {
    this.id = category.id;
    this.name = category.name;
  }
}
