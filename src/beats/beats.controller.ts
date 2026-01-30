import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { BeatsService } from './beats.service';
import { ListBeatsDto } from './dto/list-beats.dto';
import { CreateBeatDto } from './dto/create-beat.dto';
import { UpdateBeatDto } from './dto/update-beat.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AssetTypeEnum } from '../database/schemas/asset.schema';
import { UserRoleEnum } from '../database/schemas/user.schema';

@ApiTags('beats')
@Controller('beats')
export class BeatsController {
  constructor(private readonly beatsService: BeatsService) {}

  /**
   * Liste publique des beats (pas d'auth requise)
   */
  @Get()
  list(@Query() query: ListBeatsDto) {
    return this.beatsService.listBeats(query);
  }

  /**
   * Détail d'un beat (pas d'auth requise)
   */
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.beatsService.getBeatById(id);
  }

  /**
   * Créer un nouveau beat (admin/seller seulement)
   */
  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRoleEnum.admin, UserRoleEnum.seller)
  create(@Body() dto: CreateBeatDto) {
    return this.beatsService.createBeat(dto);
  }

  /**
   * Mettre à jour un beat existant (admin/seller seulement)
   */
  @Put(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRoleEnum.admin, UserRoleEnum.seller)
  update(@Param('id') id: string, @Body() dto: UpdateBeatDto) {
    return this.beatsService.updateBeat(id, dto);
  }

  /**
   * Upload cover image pour un beat
   */
  @Post(':id/cover')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRoleEnum.admin, UserRoleEnum.seller)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg, png, etc.)',
        },
      },
    },
  })
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.beatsService.uploadCover(id, file);
  }

  /**
   * Upload asset (preview, mp3, wav, stems) pour un beat
   */
  @Post(':id/assets/:type')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRoleEnum.admin, UserRoleEnum.seller)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Audio file (mp3, wav, zip for stems)',
        },
        durationSec: {
          type: 'number',
          description: 'Duration in seconds (optional)',
        },
      },
    },
  })
  async uploadAsset(
    @Param('id') id: string,
    @Param('type') type: AssetTypeEnum,
    @UploadedFile() file: Express.Multer.File,
    @Body('durationSec') durationSec?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Valider le type
    if (!Object.values(AssetTypeEnum).includes(type)) {
      throw new BadRequestException(
        `Invalid asset type. Must be one of: ${Object.values(AssetTypeEnum).join(', ')}`,
      );
    }

    const duration = durationSec ? parseFloat(durationSec) : undefined;
    return this.beatsService.uploadAsset(id, type, file, duration);
  }

  /**
   * Supprimer un beat (admin seulement)
   */
  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRoleEnum.admin)
  delete(@Param('id') id: string) {
    return this.beatsService.deleteBeat(id);
  }
}
