import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRoleEnum } from '../../database/schemas/user.schema';

export class RegisterDto {
  @IsEmail()
  // Une même adresse, quelle que soit la casse (sinon deux comptes pour « Toto@x.fr » et « toto@x.fr »).
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
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
  role?: UserRoleEnum;

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
