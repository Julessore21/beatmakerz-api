import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type ArtistDocument = Artist & Document;

@Schema({ collection: 'artists', timestamps: true })
export class Artist {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true, unique: true })
  userId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  bio?: string;

  @Prop({ type: Object })
  socialsJson?: Record<string, unknown>;

  @Prop({ type: Boolean, default: false })
  verified!: boolean;
}

export const ArtistSchema = SchemaFactory.createForClass(Artist);
ArtistSchema.index({ name: 'text' });
