import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { CheckoutService } from './checkout.service';
import { StripeService } from '../payments/stripe.service';
import { User } from '../database/schemas/user.schema';
import { Cart } from '../database/schemas/cart.schema';
import { CartItem } from '../database/schemas/cart-item.schema';
import { LicenseType } from '../database/schemas/license-type.schema';
import { Beat } from '../database/schemas/beat.schema';
import { Order } from '../database/schemas/order.schema';
import { OrderItem } from '../database/schemas/order-item.schema';

const mockCart = { _id: 'cart-1', userId: 'user-1' };
const mockCartItem = {
  beatId: 'b1',
  licenseTypeId: 'lt-1',
  unitPriceSnapshotCents: 1000,
  qty: 1,
};

function buildModule(userModel: any) {
  return Test.createTestingModule({
    providers: [
      CheckoutService,
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
      },
      { provide: StripeService, useValue: {} },
      { provide: getModelToken(User.name), useValue: userModel },
      {
        provide: getModelToken(Cart.name),
        useValue: {
          findOne: jest
            .fn()
            .mockReturnValue({ lean: () => Promise.resolve(mockCart) }),
        },
      },
      {
        provide: getModelToken(CartItem.name),
        useValue: {
          find: jest
            .fn()
            .mockReturnValue({ lean: () => Promise.resolve([mockCartItem]) }),
        },
      },
      {
        provide: getModelToken(LicenseType.name),
        useValue: {
          find: jest.fn().mockReturnValue({ lean: () => Promise.resolve([]) }),
        },
      },
      {
        provide: getModelToken(Beat.name),
        useValue: {
          find: jest.fn().mockReturnValue({ lean: () => Promise.resolve([]) }),
        },
      },
      {
        provide: getModelToken(Order.name),
        useValue: {
          create: jest
            .fn()
            .mockResolvedValue({ _id: 'order-1', id: 'order-1' }),
          updateOne: jest
            .fn()
            .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
        },
      },
      {
        provide: getModelToken(OrderItem.name),
        useValue: { insertMany: jest.fn().mockResolvedValue([]) },
      },
    ],
  }).compile();
}

describe('CheckoutService — soft-deleted user filter', () => {
  it('throws BadRequestException when user is soft-deleted (findOne returns null)', async () => {
    const userModel = {
      findOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
    };
    const module: TestingModule = await buildModule(userModel);
    const service = module.get<CheckoutService>(CheckoutService);

    await expect(service.createSession('user-deleted')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('queries userModel with deletedAt:null filter (not findById)', async () => {
    const userModel = {
      findOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
      findById: jest.fn(),
    };
    const module: TestingModule = await buildModule(userModel);
    const service = module.get<CheckoutService>(CheckoutService);

    await service.createSession('user-1').catch(() => {});

    expect(userModel.findOne).toHaveBeenCalledWith({
      _id: 'user-1',
      deletedAt: null,
    });
    expect(userModel.findById).not.toHaveBeenCalled();
  });
});
