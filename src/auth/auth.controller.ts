import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response, Request, CookieOptions } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/tokens.dto';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { URL } from 'url';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly configService: ConfigService) {}

  @Post('register')
  @Throttle({ register: { limit: 3, ttl: 60 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const response = await this.authService.register(dto);
    this.setRefreshCookie(res, response.tokens.refreshToken);
    return response;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ login: { limit: 5, ttl: 60 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const response = await this.authService.login(dto);
    this.setRefreshCookie(res, response.tokens.refreshToken);
    return response;
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @Throttle({ refresh: { limit: 10, ttl: 60 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const user = req.user as { userId: string; refreshToken: string };
    const response = await this.authService.refresh(user.userId, user.refreshToken);
    this.setRefreshCookie(res, response.tokens.refreshToken);
    return response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtRefreshGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const user = req.user as { userId: string };
    await this.authService.logout(user.userId);
    res.cookie('refreshToken', '', {
      ...this.cookieBaseOptions(),
      maxAge: 0,
    });
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      ...this.cookieBaseOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private cookieBaseOptions(): CookieOptions {
    const frontend = this.configService.get<string>('frontendUrl');
    let domain: string | undefined;
    if (frontend) {
      try {
        const hostname = new URL(frontend).hostname;
        const trimmed = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
        domain = `.${trimmed}`;
      } catch {
        domain = undefined;
      }
    }
    const envValue = this.configService.get<string>('env') ?? process.env.NODE_ENV;
    const isProd = envValue === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      domain,
    };
  }
}
