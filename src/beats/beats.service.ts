import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import { ListBeatsDto, BeatsSort } from './dto/list-beats.dto';
import { Beat, BeatDocument, BeatStatusEnum, BeatVisibilityEnum } from '../database/schemas/beat.schema';
import { Artist, ArtistDocument } from '../database/schemas/artist.schema';
import { Asset, AssetDocument, AssetTypeEnum } from '../database/schemas/asset.schema';
import { PriceOverride, PriceOverrideDocument } from '../database/schemas/price-override.schema';

@Injectable()
export class BeatsService {
  constructor(
    @InjectModel(Beat.name) private readonly beatModel: Model<BeatDocument>,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>,
    @InjectModel(PriceOverride.name) private readonly priceOverrideModel: Model<PriceOverrideDocument>,
  ) {}

  async listBeats(query: ListBeatsDto) {
    const take = query.limit ?? 20;
    const filters: Record<string, unknown> = {
      status: BeatStatusEnum.published,
      visibility: BeatVisibilityEnum.public,
    };

    let artistIdsForSearch: string[] = [];
    if (query.query) {
      const artists = await this.artistModel
        .find({ name: { $regex: query.query, $options: 'i' } })
        .select({ _id: 1 })
        .lean();
      artistIdsForSearch = artists.map((a) => a._id);
      filters.$or = [
        { title: { $regex: query.query, $options: 'i' } },
        artistIdsForSearch.length ? { artistId: { $in: artistIdsForSearch } } : undefined,
      ];
      filters.$or = (filters.$or as unknown[]).filter(Boolean);
    }

    if (query.genre) {
      filters.genres = { $in: [query.genre] };
    }

    if (query.bpmMin !== undefined || query.bpmMax !== undefined) {
      filters.bpm = {};
      if (query.bpmMin !== undefined) {
        (filters.bpm as Record<string, number>).$gte = query.bpmMin;
      }
      if (query.bpmMax !== undefined) {
        (filters.bpm as Record<string, number>).$lte = query.bpmMax;
      }
    }

    const sort: Record<string, SortOrder> =
      query.sort === BeatsSort.Popular
        ? { createdAt: -1 } // placeholder; popularity can be derived separately
        : { createdAt: -1 };

    const beats = await this.beatModel
      .find(filters)
      .sort(sort)
      .limit(take + 1)
      .lean();

    const beatIds = beats.map((b) => b._id);
    const [artists, previews, overrides] = await Promise.all([
      this.artistModel
        .find({ _id: { $in: beats.map((b) => b.artistId) } })
        .select({ name: 1, verified: 1 })
        .lean(),
      this.assetModel
        .find({ beatId: { $in: beatIds }, type: AssetTypeEnum.preview })
        .select({ beatId: 1, type: 1, storageKey: 1, durationSec: 1 })
        .lean(),
      this.priceOverrideModel.find({ beatId: { $in: beatIds } }).lean(),
    ]);

    const artistMap = new Map(artists.map((a) => [a._id.toString(), a]));
    const previewMap = new Map<string, AssetDocument[]>();
    previews.forEach((p) => {
      const key = p.beatId.toString();
      const arr = previewMap.get(key) ?? [];
      arr.push(p as unknown as AssetDocument);
      previewMap.set(key, arr);
    });

    let nextCursor: string | null = null;
    const trimmed = beats.slice(0, take);
    if (beats.length > take) {
      nextCursor = beats[take]?._id ?? null;
    }

    const items = trimmed.map((b) => ({
      ...b,
      artist: artistMap.get(b.artistId.toString()) ?? null,
      assets: previewMap.get(b._id.toString()) ?? [],
      priceOverrides: overrides.filter((o) => o.beatId === b._id),
    }));

    return { items, cursor: nextCursor };
  }

  async getBeatById(id: string) {
    const beat = await this.beatModel.findById(id).lean();
    if (!beat || beat.status !== BeatStatusEnum.published) {
      throw new NotFoundException('Beat not found');
    }

    const [artist, assets, priceOverrides] = await Promise.all([
      this.artistModel.findById(beat.artistId).select({ name: 1, verified: 1 }).lean(),
      this.assetModel.find({ beatId: id }).lean(),
      this.priceOverrideModel.find({ beatId: id }).lean(),
    ]);

    return {
      ...beat,
      artist,
      assets,
      priceOverrides,
    };
  }
}
