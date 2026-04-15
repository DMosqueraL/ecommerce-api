import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('users')
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const result = await this.usersService.findAll(page, limit);
    return {
      ...result,
      data: result.data.map((u) => new UserResponseDto(u)),
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOneOrFail(id);
    return new UserResponseDto(user);
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoleDto,
  ) {
    const user = await this.usersService.updateRole(id, body.role);
    return new UserResponseDto(user);
  }

  @Patch(':id/block')
  async updateBlock(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBlockDto,
  ) {
    const user = await this.usersService.updateBlock(id, body.isActive);
    return new UserResponseDto(user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.remove(id);
  }
}
