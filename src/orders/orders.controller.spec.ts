import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { JwtService } from "@nestjs/jwt";
import { getModelToken } from "@nestjs/mongoose";
import { Order } from "../database/schemas/order.schema";
import { OrderItem } from "../database/schemas/order-item.schema";
import { Asset } from "../database/schemas/asset.schema";

const requestUser = { userId: 'user-1', email: 'test@example.com', role: 'buyer' };

const mockOrder = {
  _id: 'order-1',
  userId: 'user-1',
  status: 'paid',
  totalCents: 2000,
  currency: 'EUR',
  items: [],
};

describe('OrdersController — GET /me/orders/:id', () => {
  let controller: OrdersController;
  let service: jest.Mocked<OrdersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            list: jest.fn(),
            createFromCart: jest.fn(),
            findOne: jest.fn(),
            findOneForUser: jest.fn(),
          },
        },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: getModelToken(Order.name), useValue: { findById: jest.fn() } },
        { provide: getModelToken(OrderItem.name), useValue: { findOne: jest.fn() } },
        { provide: getModelToken(Asset.name), useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get(OrdersService);
  });

  it('returns order detail when it belongs to the user', async () => {
    service.findOneForUser.mockResolvedValue(mockOrder as any);
    const result = await controller.findOne(requestUser, 'order-1');
    expect(result).toEqual(mockOrder);
    expect(service.findOneForUser).toHaveBeenCalledWith('order-1', 'user-1');
  });

  it('throws 404 when order belongs to another user', async () => {
    service.findOneForUser.mockResolvedValue(null);
    await expect(controller.findOne(requestUser, 'order-other')).rejects.toThrow(NotFoundException);
  });

  it('throws 404 when order does not exist', async () => {
    service.findOneForUser.mockResolvedValue(null);
    await expect(controller.findOne(requestUser, 'nonexistent')).rejects.toThrow(NotFoundException);
  });
});
