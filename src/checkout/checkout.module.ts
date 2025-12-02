import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { PaymentsModule } from '../payments/payments.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../database/schemas/user.schema';
import { Cart, CartSchema } from '../database/schemas/cart.schema';
import { CartItem, CartItemSchema } from '../database/schemas/cart-item.schema';
import { LicenseType, LicenseTypeSchema } from '../database/schemas/license-type.schema';
import { Beat, BeatSchema } from '../database/schemas/beat.schema';
import { Order, OrderSchema } from '../database/schemas/order.schema';
import { OrderItem, OrderItemSchema } from '../database/schemas/order-item.schema';

@Module({
  imports: [
    PaymentsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Cart.name, schema: CartSchema },
      { name: CartItem.name, schema: CartItemSchema },
      { name: LicenseType.name, schema: LicenseTypeSchema },
      { name: Beat.name, schema: BeatSchema },
      { name: Order.name, schema: OrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
    ]),
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
