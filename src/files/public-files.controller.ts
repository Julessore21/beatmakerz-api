import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { FilesService } from './files.service';
import { isPublicKey, R2_PREFIX } from './storage-keys';

/**
 * Pochettes des prods, lisibles par tout le monde : redirection vers une
 * adresse signée de R2 (rien d'autre que covers/… n'est servi ici).
 */
@ApiExcludeController()
@Controller('files/public')
export class PublicFilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('*path')
  async serve(@Req() req: Request, @Res() res: Response): Promise<void> {
    const raw = req.path.replace(/^\/files\/public\//, '');
    const key = raw
      .split('/')
      .map((p) => decodeURIComponent(p))
      .join('/');
    if (!isPublicKey(key)) throw new NotFoundException();
    const url = await this.filesService.signedUrl(`${R2_PREFIX}${key}`, {
      expiresIn: 86400,
    });
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.redirect(302, url);
  }
}
