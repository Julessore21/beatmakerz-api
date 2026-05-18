import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContactMessage, ContactMessageDocument } from './schemas/contact-message.schema';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(ContactMessage.name)
    private readonly contactModel: Model<ContactMessageDocument>,
  ) {}

  async create(dto: CreateContactDto): Promise<{ id: string }> {
    const message = await this.contactModel.create(dto);
    return { id: message._id as string };
  }
}
