import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'usuario@ejemplo.com',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @ApiProperty({ description: 'Contraseña del usuario', example: 'secreto123' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  password: string;
}
