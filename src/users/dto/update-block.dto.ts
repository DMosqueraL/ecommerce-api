import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBlockDto {
  @ApiProperty({ description: 'Estado activo del usuario', example: false })
  @IsBoolean({ message: 'isActive debe ser un booleano' })
  isActive: boolean;
}
