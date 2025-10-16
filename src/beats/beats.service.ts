import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, BeatStatus, BeatVisibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListBeatsDto, BeatsSort } from './dto/list-beats.dto';

@Injectable()
export class BeatsService {
  constructor(private readonly prisma: PrismaService) {}

  async listBeats(query: ListBeatsDto) {
    const where: Prisma.BeatWhereInput = {
      status: BeatStatus.published,
      visibility: BeatVisibility.public,
    };

    if (query.query) {
      where.OR = [
        { title: { contains: query.query, mode: 'insensitive' } },
        {
          artist: {
            name: { contains: query.query, mode: 'insensitive' },
          },
        },
      ];
    }

    if (query.genre) {
      where.genres = { has: query.genre };
    }

    if (query.bpmMin !== undefined || query.bpmMax !== undefined) {
      where.bpm = {};
      if (query.bpmMin !== undefined) {
        where.bpm.gte = query.bpmMin;
      }
      if (query.bpmMax !== undefined) {
        where.bpm.lte = query.bpmMax;
      }
    }

    const orderBy =
      query.sort === BeatsSort.Popular
        ? [{ orderItems: { _count: 'desc' as const } }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    const take = query.limit ?? 20;
    const beats = await this.prisma.beat.findMany({
      where,
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            verified: true,
          },
        },
        assets: {
          where: { type: 'preview' },
          select: { id: true, type: true, storageKey: true, durationSec: true },
        },
        priceOverrides: true,
      },
      orderBy,
      take: take + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
    });

    let nextCursor: string | null = null;
    if (beats.length > take) {
      const nextItem = beats.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return {
      items: beats,
      cursor: nextCursor,
    };
  }

  async getBeatById(id: string) {
    const beat = await this.prisma.beat.findUnique({
      where: { id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            verified: true,
            user: {
              select: { displayName: true, avatarUrl: true },
            },
          },
        },
        assets: true,
        priceOverrides: true,
        orderItems: {
          select: { id: true },
        },
      },
    });

    if (!beat || beat.status !== BeatStatus.published) {
      throw new NotFoundException('Beat not found');
    }

    return beat;
  }
}
