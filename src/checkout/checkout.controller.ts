import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Options,
  HttpCode,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { CustomProdCheckoutDto } from './dto/custom-prod.dto';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Options('session')
  @HttpCode(204)
  preflightSession() {
    return;
  }

  @Post('session')
  @UseGuards(JwtAccessGuard)
  createSession(@CurrentUser() user: RequestUser) {
    return this.checkoutService.createSession(user.userId);
  }

  /** Prix de la prod sur mesure, lu dans Stripe : le site affiche le prix réellement facturé. */
  @Get('custom-prod')
  customProdPrice() {
    return this.checkoutService.customProdPrice();
  }

  @Post('custom-prod')
  createCustomProdSession(@Body() dto: CustomProdCheckoutDto) {
    const { email, ...brief } = dto;
    return this.checkoutService.createCustomProdSession(brief, email);
  }
}
