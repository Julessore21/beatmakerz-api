import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AssetTypeEnum } from '../database/schemas/asset.schema';
import { UserRoleEnum } from '../database/schemas/user.schema';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRoleEnum.admin, UserRoleEnum.seller)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Upload un fichier vers FileUp
   * Remplace le système de presigned URLs S3
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        beatId: { type: 'string' },
        assetType: { type: 'string', enum: Object.values(AssetTypeEnum) },
        filename: { type: 'string' },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Construire le nom du fichier final
    const filename = this.buildFilename(file, dto);

    // Upload vers FileUp
    const downloadLink = await this.filesService.uploadFile({
      file,
      filename,
    });

    return {
      downloadLink,
      filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  /**
   * Construire le nom du fichier avec chemin logique
   * Ex: beats/123/preview/track.mp3
   */
  private buildFilename(file: Express.Multer.File, dto: UploadFileDto): string {
    const originalName = dto.filename || file.originalname;

    if (dto.assetType && dto.beatId) {
      const base = `beats/${dto.beatId}`;
      switch (dto.assetType) {
        case AssetTypeEnum.preview:
          return `${base}/preview/${originalName}`;
        case AssetTypeEnum.mp3:
          return `${base}/mp3/${originalName}`;
        case AssetTypeEnum.wav:
          return `${base}/wav/${originalName}`;
        case AssetTypeEnum.stems:
          return `${base}/stems/${originalName}`;
        case AssetTypeEnum.project:
          return `${base}/project/${originalName}`;
        default:
          return `${base}/${originalName}`;
      }
    }

    return originalName;
  }
}
