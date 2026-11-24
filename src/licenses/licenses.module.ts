import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LicenseType,
  LicenseTypeSchema,
} from '../database/schemas/license-type.schema';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LicenseType.name, schema: LicenseTypeSchema },
    ]),
  ],
  controllers: [LicensesController],
  providers: [LicensesService],
  exports: [LicensesService],
})
export class LicensesModule {}
