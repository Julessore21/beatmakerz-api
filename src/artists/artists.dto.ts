import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpsertArtistDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  socialsJson?: Record<string, unknown>;
}
