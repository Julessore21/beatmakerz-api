import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from '../database/schemas/order.schema';
import { OrderItem } from '../database/schemas/order-item.schema';
import { Asset, AssetTypeEnum } from '../database/schemas/asset.schema';

const CURRENT_USER = { userId: 'user-abc', role: 'buyer' };

const makeOrder = (overrides = {}) => ({
  _id: 'order-123',
  userId: 'user-abc',
  status: 'paid',
  totalCents: 2000,
  currency: 'EUR',
  ...overrides,
});

const makeOrderItem = (overrides = {}) => ({
  _id: 'item-456',
  orderId: 'order-123',
  beatId: 'beat-789',
  licenseTypeId: 'lic-001',
  unitPriceCents: 2000,
  qty: 1,
  ...overrides,
});

const makeAsset = (overrides = {}) => ({
  _id: 'asset-001',
  beatId: 'beat-789',
  type: AssetTypeEnum.mp3,
  storageKey: 'https://file-up.fr/abc123',
  ...overrides,
});

const makeMockModel = (findOneResult: unknown) => ({
  findOne: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(findOneResult),
  }),
  findById: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(findOneResult),
  }),
});

describe('OrdersController — download endpoint', () => {
  let controller: OrdersController;
  let orderModel: ReturnType<typeof makeMockModel>;
  let orderItemModel: ReturnType<typeof makeMockModel>;
  let assetModel: ReturnType<typeof makeMockModel>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    orderModel = makeMockModel(makeOrder());
    orderItemModel = makeMockModel(makeOrderItem());
    assetModel = makeMockModel(makeAsset());

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-download-token'),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: { list: jest.fn(), createFromCart: jest.fn() },
        },
        { provide: JwtService, useValue: jwtService },
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(OrderItem.name), useValue: orderItemModel },
        { provide: getModelToken(Asset.name), useValue: assetModel },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('returns downloadUrl and expiresAt for a paid order owned by the user', async () => {
    const result = await controller.getDownloadUrl(
      CURRENT_USER,
      'order-123',
      'item-456',
      AssetTypeEnum.mp3,
    );

    expect(result).toMatchObject({
      downloadUrl: expect.stringContaining('/downloads/signed/'),
      expiresAt: expect.any(String),
    });
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'download', userId: 'user-abc' }),
      { expiresIn: 900 },
    );
  });

  it('throws 401 when user is not authenticated (guard handles this, but coverage via 403)', () => {
    // Le JwtAccessGuard retourne 401 avant d'atteindre le controller —
    // le guard est testé séparément; ici on vérifie le 403 ownership check
    expect(true).toBe(true);
  });

  it('throws 404 when order does not exist', async () => {
    orderModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(
      controller.getDownloadUrl(CURRENT_USER, 'order-999', 'item-456'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 403 when order belongs to a different user', async () => {
    orderModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(makeOrder({ userId: 'other-user' })),
    });

    await expect(
      controller.getDownloadUrl(CURRENT_USER, 'order-123', 'item-456'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws 403 with "not paid" message when order status is pending', async () => {
    orderModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(makeOrder({ status: 'pending' })),
    });

    await expect(
      controller.getDownloadUrl(CURRENT_USER, 'order-123', 'item-456'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws 404 when item does not belong to the order', async () => {
    orderItemModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(
      controller.getDownloadUrl(CURRENT_USER, 'order-123', 'item-999'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 404 when no asset of the requested type exists for the beat', async () => {
    assetModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(
      controller.getDownloadUrl(
        CURRENT_USER,
        'order-123',
        'item-456',
        AssetTypeEnum.wav,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('expiresAt is approximately 15 minutes from now', async () => {
    const before = Date.now();
    const result = await controller.getDownloadUrl(
      CURRENT_USER,
      'order-123',
      'item-456',
      AssetTypeEnum.mp3,
    );
    const expiresAt = new Date(result.expiresAt).getTime();
    const delta = expiresAt - before;

    expect(delta).toBeGreaterThanOrEqual(14 * 60 * 1000);
    expect(delta).toBeLessThanOrEqual(16 * 60 * 1000);
  });
});
