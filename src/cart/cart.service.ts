import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { resolveLicensePrice } from '../common/utils/pricing.util';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            beat: { select: { id: true, title: true, coverUrl: true, artistId: true } },
            licenseType: true,
          },
        },
      },
    });

    if (!cart) {
      return { items: [], totalCents: 0 };
    }

    const totalCents = cart.items.reduce(
      (acc, item) => acc + item.unitPriceSnapshotCents * item.qty,
      0,
    );

    return {
      items: cart.items,
      totalCents,
      updatedAt: cart.updatedAt,
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const [beat, licenseType, overrides] = await Promise.all([
      this.prisma.beat.findUnique({
        where: { id: dto.beatId },
        select: { id: true, status: true, priceOverrides: true },
      }),
      this.prisma.licenseType.findUnique({ where: { id: dto.licenseTypeId } }),
      this.prisma.priceOverride.findMany({ where: { beatId: dto.beatId } }),
    ]);

    if (!beat || beat.status !== 'published') {
      throw new NotFoundException('Beat unavailable');
    }
    if (!licenseType) {
      throw new NotFoundException('License not found');
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const price = resolveLicensePrice(licenseType, overrides, dto.beatId);

    const item = await this.prisma.cartItem.upsert({
      where: {
        cartId_beatId_licenseTypeId: {
          cartId: cart.id,
          beatId: dto.beatId,
          licenseTypeId: dto.licenseTypeId,
        },
      },
      update: {
        qty: dto.qty,
        unitPriceSnapshotCents: price,
      },
      create: {
        cartId: cart.id,
        beatId: dto.beatId,
        licenseTypeId: dto.licenseTypeId,
        qty: dto.qty,
        unitPriceSnapshotCents: price,
      },
      include: {
        beat: true,
        licenseType: true,
      },
    });

    return item;
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }
}
