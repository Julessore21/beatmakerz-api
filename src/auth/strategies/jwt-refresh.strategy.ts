import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy, type StrategyOptionsWithRequest } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('jwt.refreshSecret');
    if (!secret) {
      throw new Error('JWT refresh secret is not configured');
    }
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtRefreshStrategy.extractFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    };
    super(options);
  }

  private static extractFromCookie(req: Request): string | null {
    if (req.cookies?.refreshToken) {
      return req.cookies.refreshToken;
    }
    return null;
  }

  validate(req: Request, payload: JwtPayload) {
    const token = req.cookies?.refreshToken ?? ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken: token,
    };
  }
}
