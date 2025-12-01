import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type UserDocument = User & Document;

export enum UserRoleEnum {
  buyer = 'buyer',
  seller = 'seller',
  admin = 'admin',
}

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true, unique: true })
  email!: string;

  @Prop({ type: String, required: true })
  passwordHash!: string;

  @Prop({ type: String, enum: Object.values(UserRoleEnum), default: UserRoleEnum.buyer })
  role!: UserRoleEnum;

  @Prop({ type: String, required: true })
  displayName!: string;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({ type: String })
  refreshTokenHash?: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
