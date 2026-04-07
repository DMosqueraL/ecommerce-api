import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  name: string;
}
