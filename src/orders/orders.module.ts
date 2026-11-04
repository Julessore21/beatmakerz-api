import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from '../database/schemas/order.schema';
import {
  OrderItem,
  OrderItemSchema,
} from '../database/schemas/order-item.schema';
import { Cart, CartSchema } from '../database/schemas/cart.schema';
import { CartItem, CartItemSchema } from '../database/schemas/cart-item.schema';
import { Asset, AssetSchema } from '../database/schemas/asset.schema';
import { Beat, BeatSchema } from '../database/schemas/beat.schema';
import {
  LicenseType,
  LicenseTypeSchema,
} from '../database/schemas/license-type.schema';
import { DownloadsModule } from '../downloads/downloads.module';

@Module({
  imports: [
    DownloadsModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: Cart.name, schema: CartSchema },
      { name: CartItem.name, schema: CartItemSchema },
      { name: Asset.name, schema: AssetSchema },
      { name: Beat.name, schema: BeatSchema },
      { name: LicenseType.name, schema: LicenseTypeSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, MongooseModule],
})
export class OrdersModule {}
