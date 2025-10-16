import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssetType, UserRole } from '@prisma/client';
import { FilesService } from './files.service';
import { PresignRequestDto, PresignOperation } from './dto/presign.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.seller)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presign')
  async presign(@Body() dto: PresignRequestDto) {
    const storageKey = this.buildStorageKey(dto);
    if (dto.operation === PresignOperation.Download) {
      return this.filesService.createDownloadUrl({ key: storageKey });
    }
    return this.filesService.createUploadUrl({ key: storageKey, contentType: dto.contentType });
  }

  private buildStorageKey(dto: PresignRequestDto): string {
    if (dto.assetType && dto.beatId) {
      const base = `beats/${dto.beatId}`;
      switch (dto.assetType) {
        case AssetType.preview:
          return `${base}/preview/${dto.filename}`;
        case AssetType.mp3:
          return `${base}/mp3/${dto.filename}`;
        case AssetType.wav:
          return `${base}/wav/${dto.filename}`;
        case AssetType.stems:
          return `${base}/stems/${dto.filename}`;
        case AssetType.project:
          return `${base}/project/${dto.filename}`;
        default:
          return `${base}/${dto.filename}`;
      }
    }
    return dto.filename;
  }
}
