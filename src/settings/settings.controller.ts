import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAccessGuard } from "../common/guards/jwt-access.guard";
import { CurrentUser, type RequestUser } from "../common/decorators/current-user.decorator";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./settings.dto";

@ApiTags('settings')
@Controller('me/settings')
@UseGuards(JwtAccessGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(@CurrentUser() user: RequestUser) {
    return this.settingsService.get(user.userId);
  }

  @Patch()
  update(@CurrentUser() user: RequestUser, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(user.userId, dto);
  }
}
