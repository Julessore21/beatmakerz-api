import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import {
  isPublicKey,
  isR2Key,
  keyOf,
  objectKey,
  R2_PREFIX,
} from './storage-keys';

interface UploadOptions {
  file: Express.Multer.File;
  filename?: string;
}

export interface UploadResult {
  /** Référence stockée en base (`r2:<clé>`), jamais une URL publique. */
  storageKey: string;
  /** Adresse publique, seulement pour une pochette (servie par /files/public). */
  publicUrl?: string;
  /** Anciens noms gardés pour l'admin : downloadLink = storageKey. */
  downloadLink: string;
  viewLink: string;
}

/**
 * Stockage des fichiers dans Cloudflare R2 (API compatible S3), bucket privé.
 * Les fichiers achetés ne sont jamais publics : chaque téléchargement reçoit
 * une adresse signée qui expire. Seules les pochettes (covers/…) sont servies
 * à tout le monde, par une redirection signée.
 * Les anciennes adresses FileUp (http…) restent lisibles tant qu'elles
 * n'ont pas été recopiées (scripts/migrate-to-r2.js).
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(private readonly configService: ConfigService) {
    const r2 =
      this.configService.get<{
        accountId?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
        bucket?: string;
      }>('r2') ?? {};
    this.bucket = r2.bucket ?? '';
    this.publicBase = (
      this.configService.get<string>('publicApiUrl') ?? ''
    ).replace(/\/$/, '');
    this.client =
      r2.accountId && r2.accessKeyId && r2.secretAccessKey && r2.bucket
        ? new S3Client({
            region: 'auto',
            // R2 : pas de sommes de contrôle automatiques (réglage conseillé par Cloudflare).
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED',
            endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: r2.accessKeyId,
              secretAccessKey: r2.secretAccessKey,
            },
          })
        : null;
    if (!this.client) {
      this.logger.warn('R2 non configuré : aucun envoi de fichier possible.');
    }
  }

  private s3(): S3Client {
    if (!this.client) {
      throw new InternalServerErrorException('File storage is not configured');
    }
    return this.client;
  }

  /** Envoie un fichier dans R2 et rend sa référence. */
  async uploadFile({ file, filename }: UploadOptions): Promise<UploadResult> {
    const key = objectKey(
      filename || file.originalname,
      randomBytes(4).toString('hex'),
    );
    try {
      await this.s3().send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream',
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `File upload failed: ${(error as Error).message}`,
      );
    }
    const storageKey = `${R2_PREFIX}${key}`;
    const publicUrl = isPublicKey(key) ? this.publicUrlOf(key) : undefined;
    return {
      storageKey,
      publicUrl,
      downloadLink: storageKey,
      viewLink: publicUrl ?? storageKey,
    };
  }

  /** Adresse publique d'une pochette : l'API redirige vers une URL signée. */
  publicUrlOf(key: string): string {
    return `${this.publicBase}/files/public/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  /**
   * Adresse temporaire pour lire ou télécharger un fichier.
   * Une ancienne adresse FileUp est rendue telle quelle (legacy).
   */
  async signedUrl(
    storageKey: string,
    options: {
      expiresIn?: number;
      downloadName?: string;
      contentType?: string;
    } = {},
  ): Promise<string> {
    if (!isR2Key(storageKey)) return storageKey;
    return getSignedUrl(
      this.s3(),
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: keyOf(storageKey),
        ResponseContentDisposition: options.downloadName
          ? `attachment; filename="${options.downloadName.replace(/["\\\r\n]/g, '')}"`
          : undefined,
        ResponseContentType: options.contentType,
      }),
      { expiresIn: options.expiresIn ?? 300 },
    );
  }

  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded';
    responseTime?: number;
  }> {
    if (!this.client) return { status: 'degraded' };
    const start = Date.now();
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { status: 'healthy', responseTime: Date.now() - start };
    } catch {
      return { status: 'degraded' };
    }
  }
}
