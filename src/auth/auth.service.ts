import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User, UserRole } from "@prisma/client";
import * as argon2 from "argon2";
import { UsersService } from "../users/users.service";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { AuthResponseDto, AuthTokensDto } from "./dto/tokens.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
        role: dto.role ?? UserRole.buyer,
        artist:
          dto.role === UserRole.seller
            ? {
                create: {
                  name: dto.artistName ?? dto.displayName,
                  bio: dto.artistBio,
                },
              }
            : undefined,
        cart: { create: {} },
      },
    });

    const tokens = await this.generateAndPersistTokens(user);
    return this.buildAuthResponse(user, tokens);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateAndPersistTokens(user);
    return this.buildAuthResponse(user, tokens);
  }

  async refresh(userId: string, refreshToken: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    const matches = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!matches) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    const tokens = await this.generateAndPersistTokens(user);
    return this.buildAuthResponse(user, tokens);
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshTokenHash(userId, null);
  }

  private async generateAndPersistTokens(user: User): Promise<AuthTokensDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const accessTtl = this.configService.get<number>('jwt.accessTtlSeconds') ?? 900;
    const refreshTtl = this.configService.get<number>('jwt.refreshTtlSeconds') ?? 2592000;

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessTtl,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshTtl,
    });

    const refreshHash = await argon2.hash(refreshToken);
    await this.usersService.updateRefreshTokenHash(user.id, refreshHash);

    return { accessToken, refreshToken };
  }

  private buildAuthResponse(user: User, tokens: AuthTokensDto): AuthResponseDto {
    return {
      tokens,
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }
}
