import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type PriceOverrideDocument = PriceOverride & Document;

@Schema({ collection: 'priceOverrides', timestamps: false })
export class PriceOverride {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true })
  beatId!: string;

  @Prop({ type: String, required: true })
  licenseTypeId!: string;

  @Prop({ type: Number, required: true })
  priceCents!: number;
}

export const PriceOverrideSchema = SchemaFactory.createForClass(PriceOverride);
PriceOverrideSchema.index({ beatId: 1, licenseTypeId: 1 }, { unique: true });
