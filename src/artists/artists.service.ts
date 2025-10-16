import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async getArtistById(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        user: { select: { displayName: true, avatarUrl: true } },
        _count: { select: { beats: true } },
      },
    });
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
    return artist;
  }

  async getArtistBeats(id: string) {
    const artistExists = await this.prisma.artist.count({ where: { id } });
    if (!artistExists) {
      throw new NotFoundException('Artist not found');
    }
    return this.prisma.beat.findMany({
      where: { artistId: id, status: 'published' },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
          },
        },
        assets: {
          where: { type: 'preview' },
          select: { id: true, type: true, storageKey: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
