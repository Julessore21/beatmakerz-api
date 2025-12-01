import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { resolveLicensePrice } from '../common/utils/pricing.util';
import { Cart, CartDocument } from '../database/schemas/cart.schema';
import { CartItem, CartItemDocument } from '../database/schemas/cart-item.schema';
import { Beat, BeatDocument, BeatStatusEnum } from '../database/schemas/beat.schema';
import { LicenseType, LicenseTypeDocument } from '../database/schemas/license-type.schema';
import { PriceOverride, PriceOverrideDocument } from '../database/schemas/price-override.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(CartItem.name) private readonly cartItemModel: Model<CartItemDocument>,
    @InjectModel(Beat.name) private readonly beatModel: Model<BeatDocument>,
    @InjectModel(LicenseType.name) private readonly licenseTypeModel: Model<LicenseTypeDocument>,
    @InjectModel(PriceOverride.name) private readonly priceOverrideModel: Model<PriceOverrideDocument>,
  ) {}

  async getCart(userId: string) {
    const cart = await this.cartModel.findOne({ userId }).lean();
    if (!cart) {
      return { items: [], totalCents: 0 };
    }

    const items = await this.cartItemModel.find({ cartId: cart._id }).lean();
    const beatIds = items.map((i) => i.beatId);
    const licenseIds = items.map((i) => i.licenseTypeId);
    const [beats, licenses] = await Promise.all([
      this.beatModel.find({ _id: { $in: beatIds } }).select({ title: 1, coverUrl: 1, artistId: 1 }).lean(),
      this.licenseTypeModel.find({ _id: { $in: licenseIds } }).lean(),
    ]);
    const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));
    const licenseMap = new Map(licenses.map((l) => [l._id.toString(), l]));

    const detailedItems = items.map((item) => ({
      ...item,
      beat: beatMap.get(item.beatId.toString()),
      licenseType: licenseMap.get(item.licenseTypeId.toString()),
    }));

    const totalCents = items.reduce((acc, item) => acc + item.unitPriceSnapshotCents * item.qty, 0);

    return { items: detailedItems, totalCents, updatedAt: cart.updatedAt };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const [beat, licenseType, overrides] = await Promise.all([
      this.beatModel.findById(dto.beatId).lean(),
      this.licenseTypeModel.findById(dto.licenseTypeId).lean(),
      this.priceOverrideModel.find({ beatId: dto.beatId }).lean(),
    ]);

    if (!beat || beat.status !== BeatStatusEnum.published) {
      throw new NotFoundException('Beat unavailable');
    }
    if (!licenseType) {
      throw new NotFoundException('License not found');
    }

    const cart = await this.cartModel
      .findOneAndUpdate({ userId }, {}, { new: true, upsert: true, setDefaultsOnInsert: true })
      .lean();

    const price = resolveLicensePrice(
      { id: licenseType._id, priceCents: licenseType.priceCents },
      overrides.map((o) => ({ beatId: o.beatId, licenseTypeId: o.licenseTypeId, priceCents: o.priceCents })),
      dto.beatId,
    );

    await this.cartItemModel.findOneAndUpdate(
      { cartId: cart._id, beatId: dto.beatId, licenseTypeId: dto.licenseTypeId },
      { qty: dto.qty, unitPriceSnapshotCents: price },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const item = await this.cartItemModel
      .findOne({ cartId: cart._id, beatId: dto.beatId, licenseTypeId: dto.licenseTypeId })
      .lean();

    return {
      ...item,
      beat,
      licenseType,
    };
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.cartModel.findOne({ userId }).lean();
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = await this.cartItemModel.findById(itemId).lean();
    if (!item || item.cartId !== cart._id) {
      throw new NotFoundException('Item not found');
    }

    await this.cartItemModel.deleteOne({ _id: itemId });
  }
}
