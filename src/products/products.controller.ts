import { Controller, Get, Post, Put, Patch, Delete, Param, Body, ParseIntPipe, HttpCode } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { Product } from './product.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { ReplaceProductDto } from './dto/replace-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(): Product[] {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Product {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateProductDto): Product {
    return this.productsService.create(body);
  }

  @Put(':id')
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReplaceProductDto,
  ): Product {
    return this.productsService.replace(id, body);
  }

  @Patch(':id')
  patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
  ): Product {
    return this.productsService.patch(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): void {
    return this.productsService.remove(id);
  }
}
