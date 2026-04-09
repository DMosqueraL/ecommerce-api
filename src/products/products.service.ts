import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ReplaceProductDto } from './dto/replace-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    categoryId?: number,
    minPrice?: number,
    maxPrice?: number,
    search?: string,
  ) {
    const where = {
      ...(categoryId !== undefined && { categoryId }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { price: { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) } }
        : {}),
      ...(search !== undefined && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take: limit, include: { category: true } }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!product) throw new NotFoundException(`Producto con id ${id} no encontrado`);
    return product;
  }

  private async validateCategoryExists(categoryId: number) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException(`Categoría con id ${categoryId} no encontrada`);
  }

  async create(data: CreateProductDto) {
    await this.validateCategoryExists(data.categoryId);
    return this.prisma.product.create({ data });
  }

  async replace(id: number, data: ReplaceProductDto) {
    await this.findOne(id);
    await this.validateCategoryExists(data.categoryId);
    return this.prisma.product.update({ where: { id }, data });
  }

  async patch(id: number, data: UpdateProductDto) {
    await this.findOne(id);
    if (data.categoryId !== undefined) await this.validateCategoryExists(data.categoryId);
    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }
}
