import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly client: Stripe;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('stripe.apiKey');
    this.client = new Stripe(apiKey);
  }

  getClient(): Stripe {
    return this.client;
  }
}
