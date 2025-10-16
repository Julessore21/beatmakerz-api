import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@ApiTags('cart')
@Controller('me/cart')
@UseGuards(JwtAccessGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: RequestUser) {
    return this.cartService.getCart(user.userId);
  }

  @Post('items')
  addItem(@CurrentUser() user: RequestUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.userId, dto);
  }

  @Delete('items/:id')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.cartService.removeItem(user.userId, id);
  }
}
