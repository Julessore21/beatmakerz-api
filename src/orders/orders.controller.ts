import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import {
  Order,
  OrderDocument,
  OrderStatusEnum,
} from '../database/schemas/order.schema';
import {
  OrderItem,
  OrderItemDocument,
} from '../database/schemas/order-item.schema';
import {
  Asset,
  AssetDocument,
  AssetTypeEnum,
} from '../database/schemas/asset.schema';
import { DownloadTokenPayload } from '../downloads/downloads.controller';

const DOWNLOAD_TTL_SECONDS = 900; // 15 minutes

@ApiTags('orders')
@ApiBearerAuth()
@Controller('me/orders')
@UseGuards(JwtAccessGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly jwtService: JwtService,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>,
  ) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.ordersService.list(user.userId);
  }

  @Post()
  createFromCart(@CurrentUser() user: RequestUser) {
    return this.ordersService.createFromCart(user.userId);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const order = await this.ordersService.findOneForUser(id, user.userId);
    if (!order) throw new NotFoundException();
    return order;
  }

  @ApiQuery({
    name: 'type',
    required: false,
    enum: AssetTypeEnum,
    description: 'Asset type (default: mp3)',
  })
  @Get(':orderId/items/:itemId/download')
  async getDownloadUrl(
    @CurrentUser() user: RequestUser,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Query('type') assetType: AssetTypeEnum = AssetTypeEnum.mp3,
  ) {
    const order = await this.orderModel.findById(orderId).lean();
    if (!order) throw new NotFoundException('Order not found');

    if (order.userId !== user.userId)
      throw new ForbiddenException('Access denied');

    if (order.status !== OrderStatusEnum.paid) {
      throw new ForbiddenException('Order has not been paid');
    }

    const item = await this.orderItemModel
      .findOne({ _id: itemId, orderId })
      .lean();
    if (!item) throw new NotFoundException('Order item not found');

    const asset = await this.assetModel
      .findOne({ beatId: item.beatId, type: assetType })
      .lean();
    if (!asset) {
      throw new NotFoundException(`No ${assetType} asset found for this beat`);
    }

    const expiresAt = new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000);

    const payload: DownloadTokenPayload = {
      sub: 'download',
      orderItemId: itemId,
      userId: user.userId,
      storageKey: asset.storageKey,
      assetType,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: DOWNLOAD_TTL_SECONDS,
    });

    return {
      downloadUrl: `/downloads/signed/${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
