import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAccessGuard } from "../common/guards/jwt-access.guard";
import { CurrentUser, type RequestUser } from "../common/decorators/current-user.decorator";
import { FavoritesService } from "./favorites.service";
import { ToggleFavoriteDto } from "./favorites.dto";

@ApiTags('favorites')
@Controller('me/favorites')
@UseGuards(JwtAccessGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.favoritesService.list(user.userId);
  }

  @Post()
  toggle(@CurrentUser() user: RequestUser, @Body() dto: ToggleFavoriteDto) {
    return this.favoritesService.toggle(user.userId, dto.beatId);
  }
}
