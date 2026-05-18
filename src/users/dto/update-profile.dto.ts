import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Transform(({ value }) => value?.trim())
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
