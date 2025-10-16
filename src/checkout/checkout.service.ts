import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../payments/stripe.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async createSession(userId: string) {
    const [user, cart] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              beat: {
                include: {
                  artist: { select: { name: true } },
                },
              },
              licenseType: true,
            },
          },
        },
      }),
    ]);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const currency = cart.items[0].licenseType.currency || 'EUR';
    const subtotalCents = cart.items.reduce(
      (acc, item) => acc + item.unitPriceSnapshotCents * item.qty,
      0,
    );

    const order = await this.prisma.order.create({
      data: {
        userId,
        status: 'pending',
        subtotalCents,
        taxCents: 0,
        totalCents: subtotalCents,
        currency,
        items: {
          create: cart.items.map((item) => ({
            beatId: item.beatId,
            licenseTypeId: item.licenseTypeId,
            unitPriceCents: item.unitPriceSnapshotCents,
            qty: item.qty,
            downloadExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          })),
        },
      },
    });

    const lineItems = cart.items.map((item) => ({
      price_data: {
        currency,
        unit_amount: item.unitPriceSnapshotCents,
        product_data: {
          name: `${item.beat.title} - ${item.licenseType.code}`,
          description: `License: ${item.licenseType.code}`,
        },
      },
      quantity: item.qty,
    }));

    const frontendUrl = this.configService.get<string>('frontendUrl');
    const session = await this.stripeService.getClient().checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: lineItems,
      success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout/cancel`,
      metadata: {
        orderId: order.id,
        userId,
      },
      payment_intent_data: {
        metadata: {
          orderId: order.id,
          userId,
        },
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return { stripeUrl: session.url, orderId: order.id };
  }
}
