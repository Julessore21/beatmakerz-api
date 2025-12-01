import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type UserSettingDocument = UserSetting & Document;

@Schema({ collection: 'userSettings', timestamps: true })
export class UserSetting {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true, unique: true })
  userId!: string;

  @Prop({ type: Boolean, default: true })
  marketingOptIn!: boolean;

  @Prop({ type: Boolean, default: true })
  dropsOptIn!: boolean;

  @Prop({ type: Boolean, default: true })
  securityOptIn!: boolean;

  @Prop({ type: Boolean, default: false })
  twoFAEnabled!: boolean;

  @Prop({ type: Boolean, default: false })
  anonymousMode!: boolean;
}

export const UserSettingSchema = SchemaFactory.createForClass(UserSetting);
UserSettingSchema.index({ userId: 1 }, { unique: true });
