import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { AuthResponseDto, AuthTokensDto } from "./dto/tokens.dto";
import { Cart, CartDocument } from "../database/schemas/cart.schema";
import { User, UserDocument, UserRoleEnum } from "../database/schemas/user.schema";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.userModel.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
      role: dto.role ?? UserRoleEnum.buyer,
    });

    await this.cartModel.create({ userId: user._id });

    const tokens = await this.generateAndPersistTokens(user.toObject());
    return this.buildAuthResponse(user.toObject(), tokens);
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

  private async generateAndPersistTokens(user: Pick<User, '_id' | 'email' | 'role'>): Promise<AuthTokensDto> {
    const payload: JwtPayload = {
      sub: user._id,
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
    await this.usersService.updateRefreshTokenHash(user._id, refreshHash);

    return { accessToken, refreshToken };
  }

  private buildAuthResponse(user: Pick<User, '_id' | 'email' | 'displayName' | 'role'>, tokens: AuthTokensDto): AuthResponseDto {
    return {
      tokens,
      userId: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }
}
