import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Role } from '../../generated/prisma/enums';
import { USER_PUBLIC_SELECT } from './users.constants';

export interface CreateUserData {
  email: string;
  password: string;
  role?: Role;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }

  async createWithProfile(data: CreateUserData) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });
      await tx.profile.create({
        data: {
          userId: user.id,
          phone: null,
          address: null,
          docType: null,
          docNumber: null,
        },
      });
      return user;
    });
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: USER_PUBLIC_SELECT,
      }),
      this.prisma.user.count(),
    ]);
    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneOrFail(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });
    if (!user)
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    return user;
  }

  async updateRole(id: number, role: Role) {
    await this.findOneOrFail(id);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: USER_PUBLIC_SELECT,
    });
  }

  async updateBlock(id: number, isActive: boolean) {
    await this.findOneOrFail(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: USER_PUBLIC_SELECT,
    });
  }

  async remove(id: number) {
    await this.findOneOrFail(id);
    await this.prisma.user.delete({ where: { id } });
  }
}
