import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  ParseFloatPipe,
  HttpCode,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ReplaceProductDto } from './dto/replace-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('categoryId', new ParseIntPipe({ optional: true }))
    categoryId?: number,
    @Query('minPrice', new ParseFloatPipe({ optional: true }))
    minPrice?: number,
    @Query('maxPrice', new ParseFloatPipe({ optional: true }))
    maxPrice?: number,
    @Query('search') search?: string,
  ) {
    const result = await this.productsService.findAll(
      page,
      limit,
      categoryId,
      minPrice,
      maxPrice,
      search,
    );
    return {
      ...result,
      data: result.data.map((p) => new ProductResponseDto(p)),
    };
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productsService.findOne(id);
    return new ProductResponseDto(product);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: CreateProductDto) {
    const product = await this.productsService.create(body);
    return new ProductResponseDto(product);
  }

  @Roles('ADMIN')
  @Put(':id')
  async replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReplaceProductDto,
  ) {
    const product = await this.productsService.replace(id, body);
    return new ProductResponseDto(product);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
  ) {
    const product = await this.productsService.patch(id, body);
    return new ProductResponseDto(product);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.remove(id);
  }
}
