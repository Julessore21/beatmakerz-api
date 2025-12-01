import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type AssetDocument = Asset & Document;

export enum AssetTypeEnum {
  preview = 'preview',
  mp3 = 'mp3',
  wav = 'wav',
  stems = 'stems',
  project = 'project',
}

@Schema({ collection: 'assets', timestamps: true })
export class Asset {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true })
  beatId!: string;

  @Prop({ type: String, enum: Object.values(AssetTypeEnum), required: true })
  type!: AssetTypeEnum;

  @Prop({ type: String, required: true })
  storageKey!: string;

  @Prop({ type: Number })
  durationSec?: number;

  @Prop({ type: Number })
  sizeBytes?: number;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
AssetSchema.index({ beatId: 1, type: 1 }, { unique: true });
