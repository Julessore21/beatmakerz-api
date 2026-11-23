import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PublicFilesController } from './public-files.controller';

@Module({
  controllers: [FilesController, PublicFilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
