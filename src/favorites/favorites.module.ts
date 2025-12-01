import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FavoritesService } from "./favorites.service";
import { FavoritesController } from "./favorites.controller";
import { Favorite, FavoriteSchema } from "../database/schemas/favorite.schema";
import { Beat, BeatSchema } from "../database/schemas/beat.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Beat.name, schema: BeatSchema },
    ]),
  ],
  providers: [FavoritesService],
  controllers: [FavoritesController],
  exports: [FavoritesService],
})
export class FavoritesModule {}
