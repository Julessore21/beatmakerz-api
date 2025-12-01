import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAccessGuard } from "../common/guards/jwt-access.guard";
import { CurrentUser, type RequestUser } from "../common/decorators/current-user.decorator";
import { OrdersService } from "./orders.service";

@ApiTags('orders')
@Controller('me/orders')
@UseGuards(JwtAccessGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.ordersService.list(user.userId);
  }

  @Post()
  createFromCart(@CurrentUser() user: RequestUser) {
    return this.ordersService.createFromCart(user.userId);
  }
}
