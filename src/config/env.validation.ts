import { plainToInstance } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from "class-validator";

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV?: NodeEnv = NodeEnv.Development;

  @IsString()
  MONGO_URI!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsNumber()
  @IsOptional()
  JWT_ACCESS_TTL_SECONDS?: number;

  @IsNumber()
  @IsOptional()
  JWT_REFRESH_TTL_SECONDS?: number;

  @IsString()
  STRIPE_KEY!: string;

  @IsString()
  STRIPE_WEBHOOK_SECRET!: string;

  @IsString()
  R2_ACCOUNT_ID!: string;

  @IsString()
  R2_ACCESS_KEY_ID!: string;

  @IsString()
  R2_SECRET_ACCESS_KEY!: string;

  @IsString()
  R2_BUCKET!: string;

  /** Adresse publique de cette API (pochettes servies par /files/public/…). */
  @IsString()
  PUBLIC_API_URL!: string;

  @IsString()
  EMAIL_API_KEY!: string;

  @IsString()
  FRONTEND_URL!: string;

  @IsNumber()
  @IsOptional()
  PORT?: number = 3000;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
