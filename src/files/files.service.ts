import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface PresignOptions {
  key: string;
  contentType?: string;
  expiresIn?: number;
}

@Injectable()
export class FilesService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('storage.bucket');
    this.s3 = new S3Client({
      region: this.configService.get<string>('storage.region'),
      endpoint: this.configService.get<string>('storage.endpoint'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('storage.accessKey'),
        secretAccessKey: this.configService.getOrThrow<string>('storage.secretKey'),
      },
      forcePathStyle: true,
    });
  }

  async createUploadUrl({ key, contentType, expiresIn = 900 }: PresignOptions) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });
    return { uploadUrl, storageKey: key };
  }

  async createDownloadUrl({ key, expiresIn = 300 }: PresignOptions) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn });
    return { downloadUrl };
  }
}
