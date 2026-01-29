import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { FilesService } from './files/files.service';

@Injectable()
export class AppService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly filesService: FilesService,
  ) {}

  async healthCheck() {
    const db = await this.checkDatabase();
    const fileup = await this.checkFileUp();
    return {
      status: db === 'ok' && fileup.status === 'healthy' ? 'ok' : 'degraded',
      db,
      fileup,
    };
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.connection?.db?.admin().ping();
      return 'ok';
    } catch (error) {
      return 'error';
    }
  }

  private async checkFileUp() {
    return this.filesService.checkHealth();
  }
}
