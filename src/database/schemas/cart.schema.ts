import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type CartDocument = Cart & Document;

@Schema({ collection: 'carts', timestamps: { createdAt: false, updatedAt: true } })
export class Cart {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true, unique: true })
  userId!: string;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
