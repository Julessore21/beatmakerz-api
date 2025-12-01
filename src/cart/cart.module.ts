import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Cart, CartSchema } from '../database/schemas/cart.schema';
import { CartItem, CartItemSchema } from '../database/schemas/cart-item.schema';
import { Beat, BeatSchema } from '../database/schemas/beat.schema';
import { LicenseType, LicenseTypeSchema } from '../database/schemas/license-type.schema';
import { PriceOverride, PriceOverrideSchema } from '../database/schemas/price-override.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: CartItem.name, schema: CartItemSchema },
      { name: Beat.name, schema: BeatSchema },
      { name: LicenseType.name, schema: LicenseTypeSchema },
      { name: PriceOverride.name, schema: PriceOverrideSchema },
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
