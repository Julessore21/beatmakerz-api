import { AssetType, BeatStatus, BeatVisibility } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBeatDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsInt()
  @Min(40)
  @Max(200)
  bpm!: number;

  @IsOptional()
  @IsString()
  key?: string;

  @IsArray()
  @IsString({ each: true })
  genres!: string[];

  @IsArray()
  @IsString({ each: true })
  moods!: string[];

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsEnum(BeatStatus)
  status: BeatStatus = BeatStatus.draft;

  @IsOptional()
  @IsString()
  artistId?: string;

  @IsEnum(BeatVisibility)
  visibility: BeatVisibility = BeatVisibility.public;
}

export class UpdateBeatDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(40)
  @Max(200)
  bpm?: number;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moods?: string[];

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsEnum(BeatStatus)
  status?: BeatStatus;

  @IsOptional()
  @IsEnum(BeatVisibility)
  visibility?: BeatVisibility;
}

export class CreateAssetDto {
  @IsEnum(AssetType)
  type!: AssetType;

  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;
}
