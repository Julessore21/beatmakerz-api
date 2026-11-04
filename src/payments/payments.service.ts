import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly stripeService: StripeService,
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.getOrThrow<string>(
      'stripe.webhookSecret',
    );
  }

  verifyAndConstructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripeService
      .getClient()
      .webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }

  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await this.handleCheckoutSessionCompleted(event);
        break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        await this.handleCheckoutSessionFailed(event);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(
    event: Stripe.Event,
  ): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;

    // Paiement différé (virement…) : on attend async_payment_succeeded.
    if (session.payment_status !== 'paid') {
      this.logger.log(`Session ${session.id} not paid yet — waiting`);
      return;
    }

    // Prod sur mesure : pas de commande en base, le brief est dans les metadata Stripe.
    if (session.metadata?.kind === 'custom_prod') {
      this.logger.log(
        `Custom production paid — session: ${session.id}, email: ${session.customer_details?.email ?? 'n/a'}`,
      );
      return;
    }

    const orderId = session.metadata?.orderId;

    if (!orderId) {
      this.logger.warn(
        `checkout.session.completed missing metadata.orderId — session: ${session.id}`,
      );
      return;
    }

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : ((session.payment_intent as Stripe.PaymentIntent)?.id ?? '');

    const { updated } = await this.ordersService.markAsPaid(
      orderId,
      paymentIntentId,
    );

    if (!updated) {
      this.logger.log(
        `Order ${orderId} already processed (idempotent skip) — event: ${event.id}`,
      );
    } else {
      this.logger.log(
        `Order ${orderId} marked as paid — paymentIntent: ${paymentIntentId}`,
      );
    }
  }

  private async handleCheckoutSessionFailed(
    event: Stripe.Event,
  ): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      this.logger.warn(
        `checkout.session.expired missing metadata.orderId — session: ${session.id}`,
      );
      return;
    }

    const { updated } = await this.ordersService.markAsFailed(orderId);

    if (updated) {
      this.logger.log(
        `Order ${orderId} marked as failed — session: ${session.id}`,
      );
    }
  }
}
