import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserSetting, UserSettingDocument } from "../database/schemas/user-setting.schema";
import { UpdateSettingsDto } from "./settings.dto";

@Injectable()
export class SettingsService {
  constructor(@InjectModel(UserSetting.name) private readonly settingsModel: Model<UserSettingDocument>) {}

  async get(userId: string) {
    const settings = await this.settingsModel.findOne({ userId }).lean();
    if (settings) return settings;
    const created = await this.settingsModel.create({ userId });
    return created.toObject();
  }

  async update(userId: string, dto: UpdateSettingsDto) {
    await this.settingsModel.updateOne({ userId }, { $set: dto }, { upsert: true });
    return this.get(userId);
  }
}
