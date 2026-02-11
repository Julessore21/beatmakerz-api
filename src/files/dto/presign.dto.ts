import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetTypeEnum } from '../../database/schemas/asset.schema';

export enum PresignOperation {
  Upload = 'upload',
  Download = 'download',
}

export class PresignRequestDto {
  @IsEnum(PresignOperation)
  operation!: PresignOperation;

  @IsString()
  @IsOptional()
  beatId?: string;

  @IsEnum(AssetTypeEnum)
  @IsOptional()
  assetType?: AssetTypeEnum;

  @IsString()
  filename!: string;

  @IsString()
  @IsOptional()
  contentType?: string;
}
