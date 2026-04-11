import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProfileDto } from './dto/create-profile.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: number) {
    return this.prisma.profile.findUnique({ where: { userId } });
  }

  async create(userId: number, data: CreateProfileDto) {
    const existing = await this.findByUserId(userId);
    if (existing) throw new ConflictException('Ya tienes un perfil creado');
    return this.prisma.profile.create({ data: { ...data, userId } });
  }

  async update(userId: number, data: UpdateProfileDto) {
    const existing = await this.findByUserId(userId);
    if (!existing) throw new NotFoundException('Perfil no encontrado');
    return this.prisma.profile.update({ where: { userId }, data });
  }
}
