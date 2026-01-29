import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BeatsService } from './beats.service';
import { BeatsController } from './beats.controller';
import { Beat, BeatSchema } from '../database/schemas/beat.schema';
import { Artist, ArtistSchema } from '../database/schemas/artist.schema';
import { Asset, AssetSchema } from '../database/schemas/asset.schema';
import { PriceOverride, PriceOverrideSchema } from '../database/schemas/price-override.schema';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Beat.name, schema: BeatSchema },
      { name: Artist.name, schema: ArtistSchema },
      { name: Asset.name, schema: AssetSchema },
      { name: PriceOverride.name, schema: PriceOverrideSchema },
    ]),
    FilesModule,
  ],
  controllers: [BeatsController],
  providers: [BeatsService],
  exports: [BeatsService],
})
export class BeatsModule {}
