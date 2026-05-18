import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [StripeService, PaymentsService],
  exports: [StripeService],
})
export class PaymentsModule {}
