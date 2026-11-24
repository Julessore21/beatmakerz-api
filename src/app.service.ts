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
    const storage = await this.filesService.checkHealth();
    return {
      status: db === 'ok' && storage.status === 'healthy' ? 'ok' : 'degraded',
      db,
      storage,
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
}
