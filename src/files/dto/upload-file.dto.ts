import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetTypeEnum } from '../../database/schemas/asset.schema';

export class UploadFileDto {
  @IsString()
  @IsOptional()
  beatId?: string;

  @IsEnum(AssetTypeEnum)
  @IsOptional()
  assetType?: AssetTypeEnum;

  @IsString()
  @IsOptional()
  filename?: string;
}
