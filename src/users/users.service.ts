import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Role } from '../../generated/prisma/enums';

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

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.user.count(),
    ]);
    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneOrFail(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    return user;
  }

  async updateRole(id: number, role: Role) {
    await this.findOneOrFail(id);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }

  async updateBlock(id: number, isActive: boolean) {
    await this.findOneOrFail(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }

  async remove(id: number) {
    await this.findOneOrFail(id);
    await this.prisma.user.delete({ where: { id } });
  }
}
