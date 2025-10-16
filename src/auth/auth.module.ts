import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "../users/users.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('jwt.accessSecret');
        if (!secret) {
          throw new Error('JWT access secret is not configured');
        }
        const expiresIn = configService.get<number>('jwt.accessTtlSeconds') ?? 900;
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
