import { IsString, IsUUID, IsInt, Min, Max } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  beatId!: string;

  @IsUUID()
  licenseTypeId!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  qty = 1;
}
