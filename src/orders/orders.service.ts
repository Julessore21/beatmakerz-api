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

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(CartItem.name)
    private readonly cartItemModel: Model<CartItemDocument>,
  ) {}

  async list(userId: string) {
    const orders = await this.orderModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    const orderIds = orders.map((o) => o._id);
    const items = await this.orderItemModel
      .find({ orderId: { $in: orderIds } })
      .lean();
    const itemsMap = new Map<string, any[]>();
    items.forEach((it) => {
      const arr = itemsMap.get(it.orderId) ?? [];
      arr.push(it);
      itemsMap.set(it.orderId, arr);
    });
    return orders.map((o) => ({
      ...o,
      items: itemsMap.get(o._id) ?? [],
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
    return { updated: result.modifiedCount > 0 };
  }

  async markAsFailed(orderId: string): Promise<{ updated: boolean }> {
    const result = await this.orderModel.updateOne(
      { _id: orderId, status: OrderStatusEnum.pending },
      { status: OrderStatusEnum.failed },
    );
    return { updated: result.modifiedCount > 0 };
  }
}
