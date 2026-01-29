import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetType } from '@prisma/client';

export class UploadFileDto {
  @IsString()
  @IsOptional()
  beatId?: string;

  @IsEnum(AssetType)
  @IsOptional()
  assetType?: AssetType;

  @IsString()
  @IsOptional()
  filename?: string;
}
