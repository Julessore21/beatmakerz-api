import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArtistsService } from './artists.service';

@ApiTags('artists')
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get(':id')
  getArtist(@Param('id') id: string) {
    return this.artistsService.getArtistById(id);
  }

  @Get(':id/beats')
  getArtistBeats(@Param('id') id: string) {
    return this.artistsService.getArtistBeats(id);
  }
}
