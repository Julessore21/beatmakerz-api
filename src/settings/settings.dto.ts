import { IsBoolean, IsOptional } from "class-validator";

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  @IsOptional()
  @IsBoolean()
  dropsOptIn?: boolean;

  @IsOptional()
  @IsBoolean()
  securityOptIn?: boolean;

  @IsOptional()
  @IsBoolean()
  twoFAEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  anonymousMode?: boolean;
}
