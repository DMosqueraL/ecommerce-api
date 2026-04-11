import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../../generated/prisma/enums';

export class UpdateStatusDto {
  @ApiProperty({ description: 'Nuevo estado del pedido', enum: OrderStatus, example: OrderStatus.CONFIRMED })
  @IsEnum(OrderStatus, { message: 'El estado debe ser PENDING, CONFIRMED, SHIPPED, DELIVERED o CANCELLED' })
  status: OrderStatus;
}
