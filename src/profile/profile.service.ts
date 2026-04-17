import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: number): Promise<ProfileResponseDto | null> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    return profile ? new ProfileResponseDto(profile) : null;
  }

  async update(userId: number, data: UpdateProfileDto): Promise<ProfileResponseDto> {
    const existing = await this.prisma.profile.findUnique({ where: { userId } });
    if (!existing) throw new NotFoundException('Perfil no encontrado');
    const profile = await this.prisma.profile.update({ where: { userId }, data });
    return new ProfileResponseDto(profile);
  }
}
