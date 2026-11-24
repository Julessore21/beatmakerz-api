import { OrdersService } from './orders.service';
import { OrderStatusEnum } from '../database/schemas/order.schema';

const chain = <T>(value: T) => {
  const query = {
    sort: () => query,
    select: () => query,
    lean: () => Promise.resolve(value),
  };
  return query;
};

describe('OrdersService', () => {
  const build = () => {
    const orderModel = {
      find: jest.fn(() =>
        chain([{ _id: 'o1', userId: 'u1', status: OrderStatusEnum.paid }]),
      ),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      findById: jest.fn(() => chain({ _id: 'o1', userId: 'u1' })),
    };
    const orderItemModel = {
      find: jest.fn(() =>
        chain([
          { _id: 'i1', orderId: 'o1', beatId: 'b1', licenseTypeId: 'l1' },
        ]),
      ),
    };
    const cartModel = { findOne: jest.fn(() => chain({ _id: 'c1' })) };
    const cartItemModel = { deleteMany: jest.fn().mockResolvedValue({}) };
    const beatModel = {
      find: jest.fn(() => chain([{ _id: 'b1', title: 'Space Wave' }])),
    };
    const licenseModel = {
      find: jest.fn(() => chain([{ _id: 'l1', code: 'Basic' }])),
    };
    const assetModel = {
      find: jest.fn(() =>
        chain([
          { beatId: 'b1', type: 'mp3' },
          { beatId: 'b1', type: 'stems' },
        ]),
      ),
    };
    const service = new OrdersService(
      orderModel as never,
      orderItemModel as never,
      cartModel as never,
      cartItemModel as never,
      beatModel as never,
      licenseModel as never,
      assetModel as never,
    );
    return { service, orderModel, cartItemModel };
  };

  it('ne liste que les commandes payées ou remboursées, avec titre et licence', async () => {
    const { service, orderModel } = build();
    const [order] = await service.list('u1');

    expect(orderModel.find).toHaveBeenCalledWith({
      userId: 'u1',
      status: { $in: [OrderStatusEnum.paid, OrderStatusEnum.refunded] },
    });
    expect(order.items[0]).toMatchObject({
      beat: { title: 'Space Wave' },
      license: { code: 'Basic' },
      downloadable: true,
      // Basic : le MP3 (le WAV n'existe pas ici), jamais les pistes.
      files: ['mp3'],
    });
  });

  it('retire du panier les beats payés quand la commande passe en payée', async () => {
    const { service, cartItemModel } = build();
    await expect(service.markAsPaid('o1', 'pi_1')).resolves.toEqual({
      updated: true,
    });
    expect(cartItemModel.deleteMany).toHaveBeenCalledWith({
      cartId: 'c1',
      beatId: { $in: ['b1'] },
    });
  });

  it('ne touche pas au panier si la commande était déjà payée (idempotence)', async () => {
    const { service, orderModel, cartItemModel } = build();
    orderModel.updateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(service.markAsPaid('o1', 'pi_1')).resolves.toEqual({
      updated: false,
    });
    expect(cartItemModel.deleteMany).not.toHaveBeenCalled();
  });
});
