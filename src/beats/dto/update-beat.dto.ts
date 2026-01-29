import { IsEnum, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';
import { BeatStatusEnum, BeatVisibilityEnum } from '../../database/schemas/beat.schema';

export class UpdateBeatDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsOptional()
  bpm?: number;

  @IsString()
  @IsOptional()
  key?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  genres?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  moods?: string[];

  @IsEnum(BeatStatusEnum)
  @IsOptional()
  status?: BeatStatusEnum;

  @IsEnum(BeatVisibilityEnum)
  @IsOptional()
  visibility?: BeatVisibilityEnum;
}
