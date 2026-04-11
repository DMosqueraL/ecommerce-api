import { Controller, Get, Post, Patch, Param, Body, Req, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { OrderStatus, PaymentMethod } from '../../generated/prisma/enums';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles('ADMIN', 'USER')
  @Post()
  create(@Req() req, @Body() body: CreateOrderDto) {
    return this.ordersService.create(req.user.id, body);
  }

  @Roles('ADMIN')
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
    @Query('status') status?: OrderStatus,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.findAll(page, limit, { status, paymentMethod, startDate, endDate, userId });
  }

  @Roles('ADMIN', 'USER')
  @Get('me')
  findMine(
    @Req() req,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: OrderStatus,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.findMine(req.user.id, page, limit, { status, paymentMethod, startDate, endDate });
  }

  @Roles('ADMIN', 'USER')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.ordersService.findOne(id, req.user.id, req.user.role);
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateStatusDto) {
    return this.ordersService.updateStatus(id, body);
  }
}
