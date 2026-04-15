import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const result = await this.categoriesService.findAll(page, limit);
    return {
      ...result,
      data: result.data.map((c) => new CategoryResponseDto(c)),
    };
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const category = await this.categoriesService.findOne(id);
    return new CategoryResponseDto(category);
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: CreateCategoryDto) {
    const category = await this.categoriesService.create(body);
    return new CategoryResponseDto(category);
  }

  @Roles('ADMIN')
  @Put(':id')
  async replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateCategoryDto,
  ) {
    const category = await this.categoriesService.replace(id, body);
    return new CategoryResponseDto(category);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
