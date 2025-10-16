import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('orders')
@Controller('me')
@UseGuards(JwtAccessGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('orders')
  list(@CurrentUser() user: RequestUser) {
    return this.ordersService.listOrders(user.userId);
  }

  @Get('orders/:id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.getOrder(user.userId, id);
  }

  @Get('downloads/:orderItemId')
  download(@CurrentUser() user: RequestUser, @Param('orderItemId') orderItemId: string) {
    return this.ordersService.getDownloadLink(user.userId, orderItemId);
  }
}
