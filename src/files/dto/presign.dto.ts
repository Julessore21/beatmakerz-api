import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetType } from '@prisma/client';

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

  @IsEnum(AssetType)
  @IsOptional()
  assetType?: AssetType;

  @IsString()
  filename!: string;

  @IsString()
  @IsOptional()
  contentType?: string;
}
