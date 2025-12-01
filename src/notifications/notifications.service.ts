import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Notification, NotificationDocument, NotificationKindEnum } from "../database/schemas/notification.schema";

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>) {}

  list(userId: string) {
    return this.notificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
  }

  async markRead(userId: string, id: string) {
    await this.notificationModel.updateOne({ _id: id, userId }, { $set: { readAt: new Date() } });
    return { read: true };
  }

  async create(userId: string, kind: NotificationKindEnum, title: string, body: string) {
    await this.notificationModel.create({ userId, kind, title, body });
  }
}
