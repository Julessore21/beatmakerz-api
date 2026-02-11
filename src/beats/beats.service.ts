import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import { ListBeatsDto, BeatsSort } from './dto/list-beats.dto';
import { CreateBeatDto } from './dto/create-beat.dto';
import { UpdateBeatDto } from './dto/update-beat.dto';
import { Beat, BeatDocument, BeatStatusEnum, BeatVisibilityEnum } from '../database/schemas/beat.schema';
import { Artist, ArtistDocument } from '../database/schemas/artist.schema';
import { Asset, AssetDocument, AssetTypeEnum } from '../database/schemas/asset.schema';
import { PriceOverride, PriceOverrideDocument } from '../database/schemas/price-override.schema';
import { FilesService } from '../files/files.service';
import { AudioProcessingService } from '../audio-processing/audio-processing.service';

@Injectable()
export class BeatsService {
  private readonly logger = new Logger(BeatsService.name);

  constructor(
    @InjectModel(Beat.name) private readonly beatModel: Model<BeatDocument>,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>,
    @InjectModel(PriceOverride.name) private readonly priceOverrideModel: Model<PriceOverrideDocument>,
    private readonly filesService: FilesService,
    private readonly audioProcessingService: AudioProcessingService,
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

  /**
   * Créer un nouveau beat (admin)
   */
  async createBeat(dto: CreateBeatDto) {
    // Vérifier que l'artist existe
    const artist = await this.artistModel.findById(dto.artistId).lean();
    if (!artist) {
      throw new BadRequestException('Artist not found');
    }

    const beat = await this.beatModel.create({
      artistId: dto.artistId,
      title: dto.title,
      bpm: dto.bpm,
      key: dto.key,
      genres: dto.genres ?? [],
      moods: dto.moods ?? [],
      status: dto.status ?? BeatStatusEnum.draft,
      visibility: dto.visibility ?? BeatVisibilityEnum.public,
    });

    return beat.toObject();
  }

  /**
   * Mettre à jour un beat existant (admin)
   */
  async updateBeat(id: string, dto: UpdateBeatDto) {
    const beat = await this.beatModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true, runValidators: true }
    );

    if (!beat) {
      throw new NotFoundException('Beat not found');
    }

    return beat.toObject();
  }

  /**
   * Upload cover image pour un beat via FileUp
   */
  async uploadCover(id: string, file: Express.Multer.File) {
    const beat = await this.beatModel.findById(id);
    if (!beat) {
      throw new NotFoundException('Beat not found');
    }

    // Upload vers FileUp
    const downloadLink = await this.filesService.uploadFile({
      file,
      filename: `beats/${id}/cover.${file.originalname.split('.').pop()}`,
    });

    // Mettre à jour le beat avec l'URL de la cover
    beat.coverUrl = downloadLink;
    await beat.save();

    return { coverUrl: downloadLink };
  }

  /**
   * Upload un asset (preview, mp3, wav, stems) pour un beat via FileUp
   */
  async uploadAsset(
    id: string,
    type: AssetTypeEnum,
    file: Express.Multer.File,
    durationSec?: number,
  ) {
    const beat = await this.beatModel.findById(id);
    if (!beat) {
      throw new NotFoundException('Beat not found');
    }

    // Upload vers FileUp
    const downloadLink = await this.filesService.uploadFile({
      file,
      filename: `beats/${id}/${type}/${file.originalname}`,
    });

    // Créer ou mettre à jour l'asset dans la base de données
    const existingAsset = await this.assetModel.findOne({ beatId: id, type });
    if (existingAsset) {
      existingAsset.storageKey = downloadLink;
      existingAsset.sizeBytes = file.size;
      if (durationSec !== undefined) {
        existingAsset.durationSec = durationSec;
      }
      await existingAsset.save();
      return existingAsset.toObject();
    }

    const asset = await this.assetModel.create({
      beatId: id,
      type,
      storageKey: downloadLink,
      sizeBytes: file.size,
      durationSec,
    });

    return asset.toObject();
  }

  /**
   * Upload audio avec génération automatique de preview
   * - Upload la version complète (mp3)
   * - Génère et upload une preview de 45 secondes
   * - Retourne les deux assets créés
   */
  async uploadAudioWithPreview(
    id: string,
    file: Express.Multer.File,
    generatePreview: boolean = true,
    previewDurationSec: number = 45,
  ) {
    const beat = await this.beatModel.findById(id);
    if (!beat) {
      throw new NotFoundException('Beat not found');
    }

    this.logger.log(`Starting audio upload for beat ${id}`);

    // 1. Obtenir les infos du fichier audio (durée totale)
    const audioInfo = await this.audioProcessingService.getAudioInfo(
      file.buffer,
      file.originalname,
    );
    this.logger.log(`Audio info: duration=${audioInfo.durationSec}s, format=${audioInfo.format}`);

    // 2. Upload de la version complète sur FileUp
    const mp3DownloadLink = await this.filesService.uploadFile({
      file,
      filename: `beats/${id}/mp3/${file.originalname}`,
    });
    this.logger.log(`Full track uploaded: ${mp3DownloadLink}`);

    // 3. Créer ou mettre à jour l'asset mp3
    const existingMp3Asset = await this.assetModel.findOne({
      beatId: id,
      type: AssetTypeEnum.mp3,
    });

    let mp3Asset;
    if (existingMp3Asset) {
      existingMp3Asset.storageKey = mp3DownloadLink;
      existingMp3Asset.sizeBytes = file.size;
      existingMp3Asset.durationSec = audioInfo.durationSec;
      await existingMp3Asset.save();
      mp3Asset = existingMp3Asset.toObject();
    } else {
      mp3Asset = await this.assetModel.create({
        beatId: id,
        type: AssetTypeEnum.mp3,
        storageKey: mp3DownloadLink,
        sizeBytes: file.size,
        durationSec: audioInfo.durationSec,
      });
      mp3Asset = mp3Asset.toObject();
    }

    // 4. Générer et upload la preview si demandé
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let previewAsset: any = null;
    if (generatePreview) {
      // Calculer la durée de la preview (max = durée totale)
      const actualPreviewDuration = Math.min(previewDurationSec, audioInfo.durationSec);

      // Générer la preview
      const previewResult = await this.audioProcessingService.generatePreview(
        file.buffer,
        actualPreviewDuration,
        file.originalname,
      );
      this.logger.log(`Preview generated: ${previewResult.buffer.length} bytes`);

      // Créer un "faux" fichier Multer pour l'upload
      const previewFile = {
        buffer: previewResult.buffer,
        originalname: `preview_${file.originalname}`,
        mimetype: 'audio/mpeg',
        size: previewResult.buffer.length,
      } as Express.Multer.File;

      // Upload de la preview sur FileUp
      const previewDownloadLink = await this.filesService.uploadFile({
        file: previewFile,
        filename: `beats/${id}/preview/${file.originalname}`,
      });
      this.logger.log(`Preview uploaded: ${previewDownloadLink}`);

      // Créer ou mettre à jour l'asset preview
      const existingPreviewAsset = await this.assetModel.findOne({
        beatId: id,
        type: AssetTypeEnum.preview,
      });

      if (existingPreviewAsset) {
        existingPreviewAsset.storageKey = previewDownloadLink;
        existingPreviewAsset.sizeBytes = previewResult.buffer.length;
        existingPreviewAsset.durationSec = actualPreviewDuration;
        await existingPreviewAsset.save();
        previewAsset = existingPreviewAsset.toObject();
      } else {
        const newPreviewAsset = await this.assetModel.create({
          beatId: id,
          type: AssetTypeEnum.preview,
          storageKey: previewDownloadLink,
          sizeBytes: previewResult.buffer.length,
          durationSec: actualPreviewDuration,
        });
        previewAsset = newPreviewAsset.toObject();
      }
    }

    this.logger.log(`Audio upload completed for beat ${id}`);

    return {
      success: true,
      assets: {
        preview: previewAsset,
        mp3: mp3Asset,
      },
      message: 'Audio uploaded and preview generated successfully',
    };
  }

  /**
   * Supprimer un beat (admin)
   */
  async deleteBeat(id: string) {
    const beat = await this.beatModel.findById(id);
    if (!beat) {
      throw new NotFoundException('Beat not found');
    }

    // Supprimer les assets associés
    await this.assetModel.deleteMany({ beatId: id });

    // Supprimer le beat
    await beat.deleteOne();

    return { message: 'Beat deleted successfully' };
  }
}
