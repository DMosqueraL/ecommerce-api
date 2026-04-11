import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProfileDto {
  @ApiProperty({ description: 'Número de teléfono', example: '+57 300 123 4567', required: false })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  phone?: string;

  @ApiProperty({ description: 'Dirección de residencia', example: 'Calle 123 # 45-67, Bogotá', required: false })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  address?: string;

  @ApiProperty({ description: 'Tipo de documento (CC, CE, PP…)', example: 'CC', required: false })
  @IsOptional()
  @IsString({ message: 'El tipo de documento debe ser una cadena de texto' })
  docType?: string;

  @ApiProperty({ description: 'Número de documento', example: '1234567890', required: false })
  @IsOptional()
  @IsString({ message: 'El número de documento debe ser una cadena de texto' })
  docNumber?: string;
}
