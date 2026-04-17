import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Televisor Samsung 55" 4K',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
  name: string;

  @ApiProperty({
    description: 'Descripción detallada del producto',
    example: 'Smart TV QLED con resolución 4K y HDR10+',
  })
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La descripción del producto es obligatoria' })
  description: string;

  @ApiProperty({
    description: 'Precio en pesos colombianos (COP)',
    example: 2890000,
  })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @IsPositive({ message: 'El precio debe ser mayor a 0' })
  price: number;

  @ApiProperty({
    description: 'Unidades disponibles en inventario',
    example: 15,
  })
  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock: number;

  @ApiProperty({
    description: 'ID de la categoría a la que pertenece el producto',
    example: 1,
  })
  @IsInt({ message: 'El categoryId debe ser un número entero' })
  @IsPositive({ message: 'El categoryId debe ser mayor a 0' })
  categoryId: number;
}
