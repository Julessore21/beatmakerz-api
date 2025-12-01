import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAccessGuard } from "../common/guards/jwt-access.guard";
import { CurrentUser, type RequestUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ArtistsService } from "./artists.service";
import { UpsertArtistDto } from "./artists.dto";
import { UserRoleEnum } from "../database/schemas/user.schema";

@ApiTags('artists')
@Controller()
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get('artists/:id')
  getArtist(@Param('id') id: string) {
    return this.artistsService.getArtistById(id);
  }

  @Get('artists/:id/beats')
  getArtistBeats(@Param('id') id: string) {
    return this.artistsService.getArtistBeats(id);
  }

  @Get('me/artist')
  @UseGuards(JwtAccessGuard)
  getMe(@CurrentUser() user: RequestUser) {
    return this.artistsService.getMyArtist(user.userId);
  }

  @Patch('me/artist')
  @UseGuards(JwtAccessGuard)
  @Roles(UserRoleEnum.seller, UserRoleEnum.admin)
  upsert(@CurrentUser() user: RequestUser, @Body() dto: UpsertArtistDto) {
    return this.artistsService.upsertMyArtist(user.userId, dto);
  }

  @Post('me/artist')
  @UseGuards(JwtAccessGuard)
  @Roles(UserRoleEnum.seller, UserRoleEnum.admin)
  create(@CurrentUser() user: RequestUser, @Body() dto: UpsertArtistDto) {
    return this.artistsService.upsertMyArtist(user.userId, dto);
  }
}
