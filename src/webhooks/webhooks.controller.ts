import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('stripe')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  handleStripe(@Req() req: Request, @Headers('stripe-signature') signature?: string) {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody ?? req.body;
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(JSON.stringify(rawBody));
    return this.webhooksService.handleStripeEvent(payload, signature);
  }
}
