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
  Req,
  Res,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Readable } from 'stream';
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
   * Liste tous les beats pour l'admin (tous statuts)
   */
  @Get('admin/all')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRoleEnum.admin, UserRoleEnum.seller)
  listAll() {
    return this.beatsService.listAllBeats();
  }

  /**
   * Proxy de streaming audio pour la preview (public, pas d'auth)
   * Supporte les requêtes Range pour la navigation dans le lecteur audio.
   */
  @Get(':id/stream/preview')
  async streamPreview(
    @Param('id') id: string,
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const fileUrl = await this.beatsService.getPreviewStorageKey(id);

      const rangeHeader = req.headers['range'] as string | undefined;
      const fetchHeaders: Record<string, string> = {};
      if (rangeHeader) {
        fetchHeaders['Range'] = rangeHeader;
      }

      const fileRes = await fetch(fileUrl, { headers: fetchHeaders });

      if (!fileRes.ok && fileRes.status !== 206) {
        return res.status(fileRes.status).json({ error: 'File unavailable' });
      }

      // Headers nécessaires pour l'audio streaming dans un <audio> HTML
      res.setHeader('Content-Type', fileRes.headers.get('content-type') || 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      const contentLength = fileRes.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      const contentRange = fileRes.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);

      res.status(fileRes.status);

      if (!fileRes.body) return res.end();

      // Pipe du stream Web ReadableStream → Node.js Readable → Express Response
      const readable = Readable.fromWeb(fileRes.body as Parameters<typeof Readable.fromWeb>[0]);
      readable.pipe(res);
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(error.status ?? 500).json({ error: error.message || 'Stream error' });
      }
    }
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
   * Upload audio with automatic preview generation
   * - Uploads full track (MP3)
   * - Automatically generates 45-second preview (pure JS, no ffmpeg)
   * - Returns both assets
   */
  @Post(':id/upload-audio')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRoleEnum.admin, UserRoleEnum.seller)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Audio file (MP3)',
        },
        generatePreview: {
          type: 'string',
          description: 'Generate preview automatically (default: "true")',
          example: 'true',
        },
      },
      required: ['file'],
    },
  })
  async uploadAudio(
    @Param('id') beatId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('generatePreview') generatePreview?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate audio format (MP3 only for automatic preview generation)
    const allowedMimeTypes = ['audio/mpeg', 'audio/mp3'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Must be MP3 for automatic preview generation. Received: ${file.mimetype}`,
      );
    }

    // Size limit: 100MB
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size is 100MB. Received: ${Math.round(file.size / 1024 / 1024)}MB`,
      );
    }

    const shouldGeneratePreview = generatePreview !== 'false';

    return this.beatsService.uploadAudioWithPreview(
      beatId,
      file,
      shouldGeneratePreview,
    );
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
