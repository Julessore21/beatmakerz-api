import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async healthCheck() {
    const db = await this.checkDatabase();
    return {
      status: db === 'ok' ? 'ok' : 'degraded',
      db,
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
