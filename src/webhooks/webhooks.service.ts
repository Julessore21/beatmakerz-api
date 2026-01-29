import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../payments/stripe.service';
import { EmailsService } from '../emails/emails.service';
import { FilesService } from '../files/files.service';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly emailsService: EmailsService,
    private readonly filesService: FilesService,
    private readonly documentsService: DocumentsService,
  ) {}

  async handleStripeEvent(rawBody: Buffer, signature: string | string[] | undefined) {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret missing');
    }
    if (!signature || (Array.isArray(signature) && signature.length === 0)) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService
        .getClient()
        .webhooks.constructEvent(
          rawBody,
          Array.isArray(signature) ? signature[0] : signature,
          webhookSecret,
        );
    } catch (error) {
      this.logger.error('Failed to verify Stripe webhook', error as Error);
      throw new BadRequestException('Invalid signature');
    }

    const alreadyProcessed = await this.prisma.webhookEvent.findUnique({
      where: { eventId: event.id },
    });

    if (alreadyProcessed?.processedAt) {
      this.logger.debug(`Stripe event ${event.id} already processed`);
      return { received: true };
    }

    const payload: Prisma.InputJsonValue = event.data.object ? JSON.parse(JSON.stringify(event.data.object)) : Prisma.JsonNull;

    await this.prisma.webhookEvent.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        provider: 'stripe',
        type: event.type,
        payloadJson: payload,
      },
      update: {
        type: event.type,
        payloadJson: payload,
      },
    });

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentIntent(event.data.object as Stripe.PaymentIntent, 'paid');
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntent(event.data.object as Stripe.PaymentIntent, 'failed');
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscription(event);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type ${event.type}`);
    }

    await this.prisma.webhookEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date() },
    });

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      this.logger.warn('Checkout session without orderId metadata');
      return;
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        stripePaymentIntentId: session.payment_intent?.toString(),
        stripeCheckoutSessionId: session.id,
        totalCents: session.amount_total ?? undefined,
        subtotalCents: session.amount_subtotal ?? undefined,
        currency: session.currency?.toUpperCase() ?? 'EUR',
      },
      include: {
        user: true,
        items: {
          include: {
            beat: {
              include: { assets: true, artist: true },
            },
            licenseType: true,
            downloadGrants: true,
          },
        },
      },
    });

    const downloadLinks: string[] = [];

    for (const item of order.items) {
      const assets = item.beat.assets.filter((asset) => asset.type !== 'preview');
      if (assets.length === 0) {
        continue;
      }
      for (const asset of assets) {
        await this.prisma.downloadGrant.upsert({
          where: { orderItemId_assetId: { orderItemId: item.id, assetId: asset.id } },
          update: {
            presignedKey: asset.storageKey,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
          create: {
            orderItemId: item.id,
            assetId: asset.id,
            presignedKey: asset.storageKey,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });

        // With FileUp, storageKey already contains the permanent download URL
        downloadLinks.push(asset.storageKey);
      }

      await this.documentsService.generateLicensePdf({
        orderId: order.id,
        issuedAt: new Date(),
        buyerName: order.user.displayName,
        buyerEmail: order.user.email,
        beatTitle: item.beat.title,
        artistName: item.beat.artist.name,
        licenseName: item.licenseType.code,
        licenseTerms: item.licenseType.termsJson as Record<string, unknown> | undefined,
      });
    }

    await this.emailsService.sendOrderConfirmation({
      to: order.user.email,
      orderId: order.id,
      downloadLinks,
    });
    await this.emailsService.sendDownloadLinksEmail({
      to: order.user.email,
      orderId: order.id,
      downloadLinks,
    });

    await this.prisma.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });
  }

  private async handlePaymentIntent(intent: Stripe.PaymentIntent, status: 'paid' | 'failed') {
    if (!intent.metadata?.orderId) {
      return;
    }
    await this.prisma.order.updateMany({
      where: { id: intent.metadata.orderId },
      data: {
        status: status === 'paid' ? 'paid' : 'failed',
        stripePaymentIntentId: intent.id,
      },
    });
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    if (!charge.metadata?.orderId) {
      return;
    }
    await this.prisma.order.updateMany({
      where: { id: charge.metadata.orderId },
      data: {
        status: 'refunded',
      },
    });
  }

  private async handleSubscription(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    if (!userId) {
      return;
    }
    if (event.type === 'customer.subscription.deleted') {
      await this.prisma.subscription.updateMany({
        where: { stripeSubId: subscription.id },
        data: { status: 'canceled' },
      });
      return;
    }
    const tier = (subscription.metadata?.tier ?? 'basic') as 'basic' | 'pro' | 'enterprise';
    const currentPeriodEndUnix = (subscription as { current_period_end?: number }).current_period_end ?? Math.floor(Date.now() / 1000);

    await this.prisma.subscription.upsert({
      where: { stripeSubId: subscription.id },
      update: {
        status: this.mapSubscriptionStatus(subscription.status),
        tier,
        currentPeriodEnd: new Date(currentPeriodEndUnix * 1000),
      },
      create: {
        userId,
        stripeSubId: subscription.id,
        status: this.mapSubscriptionStatus(subscription.status),
        tier,
        currentPeriodEnd: new Date(currentPeriodEndUnix * 1000),
      },
    });
  }

  private mapSubscriptionStatus(status: Stripe.Subscription.Status) {
    switch (status) {
      case 'active':
        return 'active';
      case 'past_due':
        return 'past_due';
      case 'canceled':
        return 'canceled';
      default:
        return 'incomplete';
    }
  }
}
