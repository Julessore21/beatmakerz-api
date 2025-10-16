import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Transform(({ value }) => value?.trim())
  displayName!: string;

  @IsOptional()
  role?: UserRole;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  artistName?: string;

  @IsOptional()
  @IsString()
  artistBio?: string;
}
