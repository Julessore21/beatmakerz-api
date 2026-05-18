import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'crypto';

export type ContactMessageDocument = ContactMessage & Document;

@Schema({ collection: 'contact_messages', timestamps: true })
export class ContactMessage {
  @Prop({ type: String, default: () => randomUUID() })
  _id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  email!: string;

  @Prop({ type: String })
  subject?: string;

  @Prop({ type: String, required: true })
  message!: string;

  @Prop({ type: String, enum: ['new', 'read', 'archived'], default: 'new' })
  status!: 'new' | 'read' | 'archived';

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const ContactMessageSchema = SchemaFactory.createForClass(ContactMessage);
