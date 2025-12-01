import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Order, OrderDocument, OrderStatusEnum } from "../database/schemas/order.schema";
import { OrderItem, OrderItemDocument } from "../database/schemas/order-item.schema";
import { Cart, CartDocument } from "../database/schemas/cart.schema";
import { CartItem, CartItemDocument } from "../database/schemas/cart-item.schema";

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name) private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(CartItem.name) private readonly cartItemModel: Model<CartItemDocument>,
  ) {}

  async list(userId: string) {
    const orders = await this.orderModel.find({ userId }).sort({ createdAt: -1 }).lean();
    const orderIds = orders.map((o) => o._id);
    const items = await this.orderItemModel.find({ orderId: { $in: orderIds } }).lean();
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

  async createFromCart(userId: string, currency = 'EUR') {
    const cart = await this.cartModel.findOne({ userId }).lean();
    if (!cart) {
      return null;
    }
    const cartItems = await this.cartItemModel.find({ cartId: cart._id }).lean();
    if (cartItems.length === 0) {
      return null;
    }
    const totalCents = cartItems.reduce((acc, item) => acc + item.unitPriceSnapshotCents * item.qty, 0);
    const order = await this.orderModel.create({
      userId,
      status: OrderStatusEnum.paid, // simplifié, pas de Stripe ici
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
}
