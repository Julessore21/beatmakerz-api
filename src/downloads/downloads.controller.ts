import {
  Controller,
  Get,
  Param,
  Res,
  UnauthorizedException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

export interface DownloadTokenPayload {
  sub: 'download';
  orderItemId: string;
  userId: string;
  storageKey: string;
  assetType: string;
}

@ApiExcludeController()
@Controller('downloads')
export class DownloadsController {
  private readonly logger = new Logger(DownloadsController.name);

  constructor(private readonly jwtService: JwtService) {}

  @Get('signed/:token')
  async serveSignedDownload(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    let payload: DownloadTokenPayload;

    try {
      payload = this.jwtService.verify<DownloadTokenPayload>(token);
    } catch {
      throw new UnauthorizedException(
        'Download link is invalid or has expired',
      );
    }

    if (payload.sub !== 'download') {
      throw new UnauthorizedException('Invalid download token');
    }

    this.logger.log(
      `Download request — orderItem: ${payload.orderItemId}, user: ${payload.userId}, type: ${payload.assetType}`,
    );

    let fileupRes: globalThis.Response;
    try {
      fileupRes = await fetch(payload.storageKey);
    } catch (err) {
      this.logger.error(
        `FileUp fetch error for ${payload.storageKey}: ${(err as Error).message}`,
      );
      res
        .status(HttpStatus.BAD_GATEWAY)
        .json({ message: 'Could not retrieve file' });
      return;
    }

    if (!fileupRes.ok) {
      this.logger.warn(
        `FileUp returned ${fileupRes.status} for ${payload.storageKey}`,
      );
      res.status(HttpStatus.BAD_GATEWAY).json({ message: 'File unavailable' });
      return;
    }

    const contentType =
      fileupRes.headers.get('content-type') ?? 'application/octet-stream';
    const filename = `beat-${payload.orderItemId}.${payload.assetType}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    const contentLength = fileupRes.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    if (!fileupRes.body) {
      res
        .status(HttpStatus.BAD_GATEWAY)
        .json({ message: 'Empty file response' });
      return;
    }

    // Pipe le stream vers la response
    const reader = fileupRes.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(Buffer.from(value));
      await pump();
    };

    try {
      await pump();
    } catch (err) {
      this.logger.error(`Stream error: ${(err as Error).message}`);
      if (!res.headersSent) {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'Stream error' });
      }
    }
  }
}
