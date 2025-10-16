import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BeatsService } from './beats.service';
import { ListBeatsDto } from './dto/list-beats.dto';

@ApiTags('beats')
@Controller('beats')
export class BeatsController {
  constructor(private readonly beatsService: BeatsService) {}

  @Get()
  list(@Query() query: ListBeatsDto) {
    return this.beatsService.listBeats(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.beatsService.getBeatById(id);
  }
}
