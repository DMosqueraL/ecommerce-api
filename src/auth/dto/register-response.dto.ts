import { ApiProperty } from '@nestjs/swagger';
import type { Role } from '../../../generated/prisma/enums';

type RegisteredUser = {
  id: number;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class RegisterResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@ecommerce.com' })
  email: string;

  @ApiProperty({ example: 'USER', enum: ['ADMIN', 'USER', 'GUEST'] })
  role: Role;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(user: RegisteredUser) {
    this.id = user.id;
    this.email = user.email;
    this.role = user.role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
