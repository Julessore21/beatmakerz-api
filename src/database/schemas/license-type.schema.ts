import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type LicenseTypeDocument = LicenseType & Document;

export enum LicenseCodeEnum {
  Basic = 'Basic',
  Premium = 'Premium',
  Unlimited = 'Unlimited',
}

@Schema({ collection: 'licenseTypes', timestamps: true })
export class LicenseType {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, enum: Object.values(LicenseCodeEnum), required: true, unique: true })
  code!: LicenseCodeEnum;

  @Prop({ type: Object, required: true })
  termsJson!: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  priceCents!: number;

  @Prop({ type: String, required: true })
  currency!: string;
}

export const LicenseTypeSchema = SchemaFactory.createForClass(LicenseType);
