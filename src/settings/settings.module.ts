import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";
import { UserSetting, UserSettingSchema } from "../database/schemas/user-setting.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: UserSetting.name, schema: UserSettingSchema }])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
