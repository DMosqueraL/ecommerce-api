import { Controller, Get, Post, Put, Patch, Delete, Param, Body, ParseIntPipe, ParseFloatPipe, HttpCode, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ReplaceProductDto } from './dto/replace-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
    @Query('minPrice', new ParseFloatPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new ParseFloatPipe({ optional: true })) maxPrice?: number,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(page, limit, categoryId, minPrice, maxPrice, search);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateProductDto) {
    return this.productsService.create(body);
  }

  @Put(':id')
  async replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReplaceProductDto,
  ) {
    return this.productsService.replace(id, body);
  }

  @Patch(':id')
  async patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
  ) {
    return this.productsService.patch(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.remove(id);
  }
}
