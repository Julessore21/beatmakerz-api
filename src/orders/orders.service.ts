import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderStatusEnum,
} from '../database/schemas/order.schema';
import {
  OrderItem,
  OrderItemDocument,
} from '../database/schemas/order-item.schema';
import { Cart, CartDocument } from '../database/schemas/cart.schema';
import {
  CartItem,
  CartItemDocument,
} from '../database/schemas/cart-item.schema';
import { Beat, BeatDocument } from '../database/schemas/beat.schema';
import {
  LicenseType,
  LicenseTypeDocument,
} from '../database/schemas/license-type.schema';
import { Asset, AssetDocument } from '../database/schemas/asset.schema';
import { filesFor, SELLABLE_FORMATS } from '../licenses/license-rules';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(CartItem.name)
    private readonly cartItemModel: Model<CartItemDocument>,
    @InjectModel(Beat.name) private readonly beatModel: Model<BeatDocument>,
    @InjectModel(LicenseType.name)
    private readonly licenseTypeModel: Model<LicenseTypeDocument>,
    @InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>,
  ) {}

  /**
   * Achats de l'utilisateur : uniquement les commandes payées ou remboursées
   * (les checkouts abandonnés restent invisibles), avec titre du beat et licence.
   */
  async list(userId: string) {
    const orders = await this.orderModel
      .find({
        userId,
        status: { $in: [OrderStatusEnum.paid, OrderStatusEnum.refunded] },
      })
      .sort({ createdAt: -1 })
      .lean();
    const items = await this.orderItemModel
      .find({ orderId: { $in: orders.map((o) => o._id) } })
      .lean();

    const beatIds = [...new Set(items.map((it) => it.beatId))];
    const [beats, licenses, files] = await Promise.all([
      this.beatModel
        .find({ _id: { $in: beatIds } })
        .select({ title: 1, coverUrl: 1, bpm: 1, key: 1 })
        .lean(),
      this.licenseTypeModel
        .find({
          _id: { $in: [...new Set(items.map((it) => it.licenseTypeId))] },
        })
        .select({ code: 1 })
        .lean(),
      this.assetModel
        .find({ beatId: { $in: beatIds }, type: { $in: SELLABLE_FORMATS } })
        .select({ beatId: 1, type: 1 })
        .lean(),
    ]);
    const formatsOf = (beatId: string) =>
      files.filter((f) => f.beatId === beatId).map((f) => f.type);
    const beatMap = new Map(beats.map((b) => [String(b._id), b]));
    const licenseMap = new Map(licenses.map((l) => [String(l._id), l]));

    return orders.map((o) => ({
      ...o,
      items: items
        .filter((it) => it.orderId === o._id)
        .map((it) => ({
          ...it,
          beat: beatMap.get(it.beatId) ?? null,
          license: licenseMap.get(it.licenseTypeId) ?? null,
          downloadable: o.status === OrderStatusEnum.paid,
          // Les fichiers que la licence donne et qui existent : ce que le compte propose de télécharger.
          files: filesFor(
            licenseMap.get(it.licenseTypeId)?.code,
            formatsOf(it.beatId),
          ),
        })),
    }));
  }

  async findOne(orderId: string) {
    const order = await this.orderModel.findById(orderId).lean();
    if (!order) throw new NotFoundException('Order not found');
    const items = await this.orderItemModel.find({ orderId }).lean();
    return { ...order, items };
  }

  async findOneForUser(id: string, userId: string) {
    const order = await this.orderModel.findById(id).lean();
    if (!order || order.userId !== userId) return null;
    const items = await this.orderItemModel.find({ orderId: id }).lean();
    return { ...order, items };
  }

  async createFromCart(userId: string, currency = 'EUR') {
    const cart = await this.cartModel.findOne({ userId }).lean();
    if (!cart) throw new BadRequestException('Cart not found');

    const cartItems = await this.cartItemModel
      .find({ cartId: cart._id })
      .lean();
    if (cartItems.length === 0) throw new BadRequestException('Cart is empty');

    const totalCents = cartItems.reduce(
      (acc, item) => acc + item.unitPriceSnapshotCents * item.qty,
      0,
    );
    const order = await this.orderModel.create({
      userId,
      status: OrderStatusEnum.pending,
      totalCents,
      currency,
    });
    await this.orderItemModel.insertMany(
      cartItems.map((ci) => ({
        orderId: order._id,
        beatId: ci.beatId,
        licenseTypeId: ci.licenseTypeId,
        unitPriceCents: ci.unitPriceSnapshotCents,
        qty: ci.qty,
      })),
    );
    await this.cartItemModel.deleteMany({ cartId: cart._id });
    return this.list(userId);
  }

  async markAsPaid(
    orderId: string,
    stripePaymentIntentId: string,
  ): Promise<{ updated: boolean }> {
    const result = await this.orderModel.updateOne(
      { _id: orderId, status: OrderStatusEnum.pending },
      {
        status: OrderStatusEnum.paid,
        paidAt: new Date(),
        stripePaymentIntentId,
      },
    );
    const updated = result.modifiedCount > 0;
    if (updated) await this.removePaidItemsFromCart(orderId);
    return { updated };
  }

  /** Retire du panier de l'acheteur les beats qu'il vient de payer. */
  private async removePaidItemsFromCart(orderId: string) {
    const order = await this.orderModel.findById(orderId).lean();
    const cart = order
      ? await this.cartModel.findOne({ userId: order.userId }).lean()
      : null;
    if (!cart) return;
    const paidBeatIds = (
      await this.orderItemModel.find({ orderId }).lean()
    ).map((it) => it.beatId);
    await this.cartItemModel.deleteMany({
      cartId: cart._id,
      beatId: { $in: paidBeatIds },
    });
  }

  async markAsFailed(orderId: string): Promise<{ updated: boolean }> {
    const result = await this.orderModel.updateOne(
      { _id: orderId, status: OrderStatusEnum.pending },
      { status: OrderStatusEnum.failed },
    );
    return { updated: result.modifiedCount > 0 };
  }
}
