import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetType, BeatStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateBeatDto, CreateAssetDto, UpdateBeatDto } from './dto/create-beat.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly filesService: FilesService) {}

  async createBeat(userId: string, role: UserRole, dto: CreateBeatDto) {
    const artistId = await this.resolveArtistId(userId, role, dto.artistId);
    const beat = await this.prisma.beat.create({
      data: {
        title: dto.title,
        bpm: dto.bpm,
        key: dto.key,
        genres: dto.genres,
        moods: dto.moods,
        coverUrl: dto.coverUrl,
        status: dto.status ?? BeatStatus.draft,
        visibility: dto.visibility,
        artistId,
      },
    });
    return beat;
  }

  async updateBeat(userId: string, role: UserRole, beatId: string, dto: UpdateBeatDto) {
    await this.ensureBeatOwnership(userId, role, beatId);
    return this.prisma.beat.update({
      where: { id: beatId },
      data: dto,
    });
  }

  /**
   * DEPRECATED: Cette méthode utilise l'ancien système S3 avec presigned URLs
   * Utilisez les endpoints POST /beats/:id/assets/:type du BeatsController à la place
   */
  async createAsset(userId: string, role: UserRole, beatId: string, dto: CreateAssetDto) {
    throw new Error(
      'createAsset is deprecated with FileUp. Use POST /beats/:id/assets/:type endpoint instead.'
    );
  }

  private async resolveArtistId(userId: string, role: UserRole, requestedArtistId?: string): Promise<string> {
    if (role === UserRole.admin && requestedArtistId) {
      const exists = await this.prisma.artist.count({ where: { id: requestedArtistId } });
      if (!exists) {
        throw new NotFoundException('Artist not found');
      }
      return requestedArtistId;
    }

    const artist = await this.prisma.artist.findUnique({ where: { userId } });
    if (!artist) {
      throw new ForbiddenException('Artist profile missing');
    }
    return artist.id;
  }

  private async ensureBeatOwnership(userId: string, role: UserRole, beatId: string) {
    if (role === UserRole.admin) {
      return;
    }

    const beat = await this.prisma.beat.findUnique({
      where: { id: beatId },
      select: {
        artist: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!beat) {
      throw new NotFoundException('Beat not found');
    }

    if (beat.artist.userId !== userId) {
      throw new ForbiddenException('You cannot modify this beat');
    }
  }

  private buildStorageKey(beatId: string, type: AssetType, filename: string): string {
    const base = `beats/${beatId}`;
    switch (type) {
      case AssetType.preview:
        return `${base}/preview/${filename}`;
      case AssetType.mp3:
        return `${base}/mp3/${filename}`;
      case AssetType.wav:
        return `${base}/wav/${filename}`;
      case AssetType.stems:
        return `${base}/stems/${filename}`;
      case AssetType.project:
        return `${base}/project/${filename}`;
      default:
        return `${base}/${filename}`;
    }
  }
}
