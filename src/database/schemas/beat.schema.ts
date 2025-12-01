import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type BeatDocument = Beat & Document;

export enum BeatStatusEnum {
  draft = 'draft',
  published = 'published',
}

export enum BeatVisibilityEnum {
  public = 'public',
  unlisted = 'unlisted',
}

@Schema({ collection: 'beats', timestamps: true })
export class Beat {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true })
  artistId!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: Number, required: true })
  bpm!: number;

  @Prop({ type: String })
  key?: string;

  @Prop({ type: [String], default: [] })
  genres!: string[];

  @Prop({ type: [String], default: [] })
  moods!: string[];

  @Prop({ type: String })
  coverUrl?: string;

  @Prop({ type: String, enum: Object.values(BeatStatusEnum), default: BeatStatusEnum.draft })
  status!: BeatStatusEnum;

  @Prop({ type: String, enum: Object.values(BeatVisibilityEnum), default: BeatVisibilityEnum.public })
  visibility!: BeatVisibilityEnum;
}

export const BeatSchema = SchemaFactory.createForClass(Beat);
BeatSchema.index({ artistId: 1, createdAt: -1 });
BeatSchema.index({ title: 'text', genres: 1, moods: 1 });
