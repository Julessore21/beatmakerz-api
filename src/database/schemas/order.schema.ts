import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type OrderDocument = Order & Document;

export enum OrderStatusEnum {
  pending = 'pending',
  paid = 'paid',
  failed = 'failed',
  refunded = 'refunded',
}

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, enum: Object.values(OrderStatusEnum), default: OrderStatusEnum.pending })
  status!: OrderStatusEnum;

  @Prop({ type: Number, required: true })
  totalCents!: number;

  @Prop({ type: String, required: true })
  currency!: string;

  @Prop({ type: String })
  stripeCheckoutSessionId?: string;

  @Prop({ type: String })
  stripePaymentIntentId?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, createdAt: -1 });
