import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService, private readonly filesService: FilesService) {}

  async listOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            beat: { select: { id: true, title: true, coverUrl: true } },
            licenseType: true,
          },
        },
      },
    });
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            beat: { select: { id: true, title: true, coverUrl: true } },
            licenseType: true,
            downloadGrants: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async getDownloadLink(userId: string, orderItemId: string) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { userId } },
      include: {
        downloadGrants: {
          include: {
            asset: true,
          },
        },
        beat: {
          include: {
            assets: true,
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Download unavailable');
    }

    const asset =
      orderItem.downloadGrants[0]?.asset ??
      orderItem.beat.assets.find((a) => a.type !== 'preview') ??
      orderItem.beat.assets[0];

    if (!asset) {
      throw new NotFoundException('No assets linked to this beat');
    }

    const downloadUrl = await this.filesService.createDownloadUrl({ key: asset.storageKey });

    await this.prisma.downloadGrant.upsert({
      where: { orderItemId_assetId: { orderItemId, assetId: asset.id } },
      update: {
        presignedKey: asset.storageKey,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      create: {
        orderItemId,
        assetId: asset.id,
        presignedKey: asset.storageKey,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return downloadUrl;
  }
}
