import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'Nuevo rol del usuario',
    enum: Role,
    example: Role.USER,
  })
  @IsEnum(Role, { message: 'El rol debe ser ADMIN, USER o GUEST' })
  role: Role;
}
