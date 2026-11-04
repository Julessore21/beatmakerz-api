import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CustomProdCheckoutDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  genre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  bpm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instruments?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  brief?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  file?: string;
}
