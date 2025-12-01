import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Artist, ArtistDocument } from "../database/schemas/artist.schema";
import { Beat, BeatDocument, BeatStatusEnum } from "../database/schemas/beat.schema";
import { UpsertArtistDto } from "./artists.dto";

@Injectable()
export class ArtistsService {
  constructor(
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Beat.name) private readonly beatModel: Model<BeatDocument>,
  ) {}

  async getArtistById(id: string) {
    const artist = await this.artistModel.findById(id).lean();
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
    const beatsCount = await this.beatModel.countDocuments({ artistId: id, status: BeatStatusEnum.published });
    return { ...artist, beatsCount };
  }

  async getArtistBeats(id: string) {
    const exists = await this.artistModel.exists({ _id: id });
    if (!exists) {
      throw new NotFoundException('Artist not found');
    }
    return this.beatModel
      .find({ artistId: id, status: BeatStatusEnum.published })
      .sort({ createdAt: -1 })
      .select({ title: 1, coverUrl: 1, bpm: 1, genres: 1, moods: 1, artistId: 1 })
      .lean();
  }

  async getMyArtist(userId: string) {
    return this.artistModel.findOne({ userId }).lean();
  }

  async upsertMyArtist(userId: string, dto: UpsertArtistDto) {
    await this.artistModel.updateOne(
      { userId },
      {
        $set: {
          name: dto.name,
          bio: dto.bio,
          socialsJson: dto.socialsJson,
        },
      },
      { upsert: true },
    );
    return this.getMyArtist(userId);
  }
}
