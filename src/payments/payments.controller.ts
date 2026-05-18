import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@ApiExcludeController()
@Controller('webhooks')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  handleStripeWebhook(@Req() req: RawBodyRequest, @Res() res: Response): void {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'Missing stripe-signature header' });
      return;
    }

    if (!req.rawBody) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: 'Missing raw body' });
      return;
    }

    let event: Stripe.Event;
    try {
      event = this.paymentsService.verifyAndConstructEvent(
        req.rawBody,
        signature,
      );
    } catch (err) {
      this.logger.warn(
        `Stripe webhook signature verification failed: ${(err as Error).message}`,
      );
      res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid signature' });
      return;
    }

    // Répondre 200 immédiatement pour respecter le timeout Stripe (30s)
    res.status(HttpStatus.OK).json({ received: true });

    // Traitement async — Stripe a déjà reçu son 200
    const capturedEvent = event;
    void this.paymentsService.handleEvent(capturedEvent).catch((err) => {
      this.logger.error(
        `Error handling Stripe event ${capturedEvent.id}: ${(err as Error).message}`,
      );
    });
  }
}
