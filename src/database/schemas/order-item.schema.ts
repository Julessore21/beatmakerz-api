import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type OrderItemDocument = OrderItem & Document;

@Schema({ collection: 'orderItems', timestamps: true })
export class OrderItem {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true })
  orderId!: string;

  @Prop({ type: String, required: true })
  beatId!: string;

  @Prop({ type: String, required: true })
  licenseTypeId!: string;

  @Prop({ type: Number, required: true })
  unitPriceCents!: number;

  @Prop({ type: Number, default: 1 })
  qty!: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
OrderItemSchema.index({ orderId: 1 });
