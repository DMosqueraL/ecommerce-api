import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        skip,
        take: limit,
        include: { products: true },
      }),
      this.prisma.category.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!category)
      throw new NotFoundException(`Categoría con id ${id} no encontrada`);
    return category;
  }

  async create(data: CreateCategoryDto) {
    return this.prisma.category.create({ data, include: { products: true } });
  }

  async replace(id: number, data: CreateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data,
      include: { products: true },
    });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
  }
}
