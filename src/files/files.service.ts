import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FileUpResponse {
  status: string;
  file: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    expireIn: string;
    directDownload: boolean;
  };
  downloadLink: string;
  viewLink: string;
}

interface UploadOptions {
  file: Express.Multer.File;
  filename?: string;
}

@Injectable()
export class FilesService {
  private readonly apiKey: string;
  private readonly uploadEndpoint = 'https://file-up.fr/api/sharex/upload';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('fileup.apiKey');
  }

  /**
   * Upload un fichier vers FileUp
   * @param options - Fichier et nom optionnel
   * @returns downloadLink (URL permanente du fichier)
   */
  async uploadFile({ file, filename }: UploadOptions): Promise<string> {
    try {
      // Créer FormData
      const formData = new FormData();

      // Create Blob from buffer (type cast for Node.js compatibility)
      const blob = new Blob([file.buffer as BlobPart], { type: file.mimetype });
      formData.append('file', blob, filename || file.originalname);
      formData.append('directDownload', '1');
      formData.append('expiry', 'null');

      // Upload vers FileUp
      const response = await fetch(this.uploadEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text().catch(() => 'Unknown error');
        throw new Error(`FileUp upload failed: ${response.status} - ${error}`);
      }

      const data: FileUpResponse = await response.json();

      if (!data.downloadLink) {
        throw new Error('FileUp response missing downloadLink');
      }

      return data.downloadLink;
    } catch (error) {
      throw new InternalServerErrorException(
        `File upload failed: ${error.message}`,
      );
    }
  }

  /**
   * Convertit un lien dashboard FileUp en lien de téléchargement direct
   * https://file-up.fr/dashboard/view/<id>  →  https://file-up.fr/<id>
   */
  private toDirectLink(url: string): string {
    return url.replace('/dashboard/view/', '/');
  }

  /**
   * Health check pour vérifier si FileUp est disponible
   */
  async checkHealth(): Promise<{ status: 'healthy' | 'degraded'; responseTime?: number }> {
    const start = Date.now();
    try {
      const response = await fetch(this.uploadEndpoint, {
        method: 'OPTIONS',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - start;

      if (response.ok) {
        return { status: 'healthy', responseTime };
      }

      return { status: 'degraded', responseTime };
    } catch (error) {
      return { status: 'degraded' };
    }
  }
}
