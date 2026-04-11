import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsInt, IsPositive, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../../generated/prisma/enums';

export class OrderItemDto {
  @ApiProperty({ description: 'ID del producto', example: 1 })
  @IsInt({ message: 'El productId debe ser un número entero' })
  @IsPositive({ message: 'El productId debe ser mayor a 0' })
  productId: number;

  @ApiProperty({ description: 'Cantidad a pedir', example: 2 })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @IsPositive({ message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  @ApiProperty({ description: 'Porcentaje de descuento (0-100)', example: 10, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @Max(100, { message: 'El descuento no puede superar el 100%' })
  discountPercent?: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto], description: 'Lista de productos y cantidades' })
  @IsArray({ message: 'items debe ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ description: 'Dirección de envío', example: 'Calle 123 # 45-67, Bogotá' })
  @IsString({ message: 'La dirección de envío debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección de envío es obligatoria' })
  shippingAddress: string;

  @ApiProperty({ description: 'Dirección de facturación', example: 'Calle 123 # 45-67, Bogotá' })
  @IsString({ message: 'La dirección de facturación debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección de facturación es obligatoria' })
  billingAddress: string;

  @ApiProperty({ description: 'Método de pago', enum: PaymentMethod, example: PaymentMethod.TARJETA })
  @IsEnum(PaymentMethod, { message: 'El método de pago debe ser TARJETA, TRANSFERENCIA o CONTRA_ENTREGA' })
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Empresa de envío', example: 'Servientrega' })
  @IsString({ message: 'La empresa de envío debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La empresa de envío es obligatoria' })
  shippingCompany: string;

  @ApiProperty({ description: 'Número de guía', example: 'SRV-123456' })
  @IsString({ message: 'El número de guía debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de guía es obligatorio' })
  trackingNumber: string;

  @ApiProperty({ description: 'Teléfono de la transportadora', example: '018000123456' })
  @IsString({ message: 'El teléfono de la transportadora debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El teléfono de la transportadora es obligatorio' })
  carrierPhone: string;
}
