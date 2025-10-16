import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { StripeService } from './payments/stripe.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService, private readonly stripeService: StripeService) {}

  async healthCheck() {
    const db = await this.checkDatabase();
    const stripe = this.checkStripe();

    return {
      status: db === 'ok' && stripe === 'ok' ? 'ok' : 'degraded',
      db,
      stripe,
    };
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch (error) {
      return 'error';
    }
  }

  private checkStripe(): 'ok' | 'missing' {
    try {
      this.stripeService.getClient();
      return 'ok';
    } catch (error) {
      return 'missing';
    }
  }
}
