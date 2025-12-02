import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from '../payments/stripe.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../database/schemas/user.schema';
import { Cart, CartDocument } from '../database/schemas/cart.schema';
import { CartItem, CartItemDocument } from '../database/schemas/cart-item.schema';
import { LicenseType, LicenseTypeDocument } from '../database/schemas/license-type.schema';
import { Beat, BeatDocument } from '../database/schemas/beat.schema';
import { Order, OrderDocument, OrderStatusEnum } from '../database/schemas/order.schema';
import { OrderItem, OrderItemDocument } from '../database/schemas/order-item.schema';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly configService: ConfigService,
    private readonly stripeService: StripeService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(CartItem.name) private readonly cartItemModel: Model<CartItemDocument>,
    @InjectModel(LicenseType.name) private readonly licenseTypeModel: Model<LicenseTypeDocument>,
    @InjectModel(Beat.name) private readonly beatModel: Model<BeatDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name) private readonly orderItemModel: Model<OrderItemDocument>,
  ) {}

  async createSession(userId: string) {
    const [user, cart] = await Promise.all([
      this.userModel.findById(userId).lean(),
      this.cartModel.findOne({ userId }).lean(),
    ]);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const cartItems = cart ? await this.cartItemModel.find({ cartId: cart._id }).lean() : [];
    if (!cart || cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const licenseTypeIds = [...new Set(cartItems.map((it) => it.licenseTypeId))];
    const beatIds = [...new Set(cartItems.map((it) => it.beatId))];
    const [licenseTypes, beats] = await Promise.all([
      this.licenseTypeModel.find({ _id: { $in: licenseTypeIds } }).lean(),
      this.beatModel.find({ _id: { $in: beatIds } }).lean(),
    ]);
    const licenseMap = new Map(licenseTypes.map((l) => [l._id.toString(), l]));
    const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));

    const currency = licenseTypes[0]?.currency || 'EUR';
    const subtotalCents = cartItems.reduce((acc, item) => acc + item.unitPriceSnapshotCents * item.qty, 0);

    const order = await this.orderModel.create({
      userId,
      status: OrderStatusEnum.pending,
      totalCents: subtotalCents,
      currency,
    });

    const orderItemsPayload = cartItems.map((item) => ({
      orderId: order._id,
      beatId: item.beatId,
      licenseTypeId: item.licenseTypeId,
      unitPriceCents: item.unitPriceSnapshotCents,
      qty: item.qty,
    }));
    await this.orderItemModel.insertMany(orderItemsPayload);

    const lineItems = cartItems.map((item) => {
      const beat = beatMap.get(item.beatId);
      const license = licenseMap.get(item.licenseTypeId);
      return {
        price_data: {
          currency,
          unit_amount: item.unitPriceSnapshotCents,
          product_data: {
            name: `${beat?.title ?? 'Beat'} - ${license?.code ?? ''}`,
            description: `License: ${license?.code ?? ''}`,
          },
        },
        quantity: item.qty,
      };
    });

    const frontendUrl = this.configService.get<string>('frontendUrl');
    const successUrl = `${frontendUrl}/web/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/web/checkout/cancel`;
    const session = await this.stripeService.getClient().checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
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

    await this.orderModel.updateOne({ _id: order._id }, { stripeCheckoutSessionId: session.id });

    return { url: session.url, orderId: order._id };
  }
}
