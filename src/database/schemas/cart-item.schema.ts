import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type CartItemDocument = CartItem & Document;

@Schema({ collection: 'cartItems', timestamps: { createdAt: true, updatedAt: false } })
export class CartItem {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true })
  cartId!: string;

  @Prop({ type: String, required: true })
  beatId!: string;

  @Prop({ type: String, required: true })
  licenseTypeId!: string;

  @Prop({ type: Number, default: 1 })
  qty!: number;

  @Prop({ type: Number, required: true })
  unitPriceSnapshotCents!: number;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);
CartItemSchema.index({ cartId: 1, beatId: 1, licenseTypeId: 1 }, { unique: true });
CartItemSchema.index({ cartId: 1 });
