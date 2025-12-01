import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Favorite, FavoriteDocument } from "../database/schemas/favorite.schema";
import { Beat, BeatDocument, BeatStatusEnum } from "../database/schemas/beat.schema";

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(Favorite.name) private readonly favoriteModel: Model<FavoriteDocument>,
    @InjectModel(Beat.name) private readonly beatModel: Model<BeatDocument>,
  ) {}

  async list(userId: string) {
    const favs = await this.favoriteModel.find({ userId }).lean();
    const beatIds = favs.map((f) => f.beatId);
    const beats = await this.beatModel
      .find({ _id: { $in: beatIds }, status: BeatStatusEnum.published })
      .select({ title: 1, coverUrl: 1, artistId: 1 })
      .lean();
    const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));
    return favs.map((f) => ({
      id: f._id,
      beatId: f.beatId,
      beat: beatMap.get(f.beatId) ?? null,
      createdAt: (f as any).createdAt,
    }));
  }

  async toggle(userId: string, beatId: string) {
    const existing = await this.favoriteModel.findOne({ userId, beatId }).lean();
    if (existing) {
      await this.favoriteModel.deleteOne({ _id: existing._id });
      return { removed: true };
    }
    const beat = await this.beatModel.findOne({ _id: beatId, status: BeatStatusEnum.published }).lean();
    if (!beat) {
      throw new Error('Beat not found');
    }
    await this.favoriteModel.create({ userId, beatId });
    return { added: true };
  }
}
