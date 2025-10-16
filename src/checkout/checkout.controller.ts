import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('checkout')
@Controller('checkout')
@UseGuards(JwtAccessGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('session')
  createSession(@CurrentUser() user: RequestUser) {
    return this.checkoutService.createSession(user.userId);
  }
}
