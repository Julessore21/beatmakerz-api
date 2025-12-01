import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ArtistsService } from "./artists.service";
import { ArtistsController } from "./artists.controller";
import { Artist, ArtistSchema } from "../database/schemas/artist.schema";
import { Beat, BeatSchema } from "../database/schemas/beat.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Artist.name, schema: ArtistSchema },
      { name: Beat.name, schema: BeatSchema },
    ]),
  ],
  providers: [ArtistsService],
  controllers: [ArtistsController],
  exports: [ArtistsService],
})
export class ArtistsModule {}
