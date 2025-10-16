import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum BeatsSort {
  New = 'new',
  Popular = 'popular',
}

export class ListBeatsDto {
  @IsOptional()
  @Transform(({ value }) => value?.toString())
  @IsString()
  query?: string;

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  @IsString()
  genre?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  bpmMin?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  bpmMax?: number;

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsEnum(BeatsSort)
  sort?: BeatsSort = BeatsSort.New;
}
