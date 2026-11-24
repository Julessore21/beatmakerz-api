import { BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { BeatStatusEnum } from '../database/schemas/beat.schema';

const lean = <T>(v: T) => ({ lean: () => Promise.resolve(v) });

describe('CartService — licence vendable', () => {
  const build = (hasMp3: boolean) => {
    const cartModel = { findOneAndUpdate: jest.fn(() => lean({ _id: 'c1' })) };
    const cartItemModel = {
      findOneAndUpdate: jest.fn(() => Promise.resolve({})),
      findOne: jest.fn(() => lean({ _id: 'ci1' })),
    };
    const beatModel = {
      findById: jest.fn(() =>
        lean({ _id: 'b1', status: BeatStatusEnum.published }),
      ),
    };
    const licenseModel = {
      findById: jest.fn(() =>
        lean({ _id: 'l1', code: 'Basic', priceCents: 999 }),
      ),
    };
    const overrideModel = { find: jest.fn(() => lean([])) };
    const assetModel = {
      exists: jest.fn(() => Promise.resolve(hasMp3 ? { _id: 'a1' } : null)),
    };
    const service = new CartService(
      cartModel as never,
      cartItemModel as never,
      beatModel as never,
      licenseModel as never,
      overrideModel as never,
      assetModel as never,
    );
    return { service, cartItemModel, assetModel };
  };

  it('refuse une licence Basic quand la prod n’a pas de MP3', async () => {
    const { service, cartItemModel } = build(false);
    await expect(
      service.addItem('u1', { beatId: 'b1', licenseTypeId: 'l1', qty: 1 }),
    ).rejects.toThrow(BadRequestException);
    expect(cartItemModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('accepte la licence quand le fichier requis existe', async () => {
    const { service, assetModel, cartItemModel } = build(true);
    await service.addItem('u1', { beatId: 'b1', licenseTypeId: 'l1', qty: 1 });
    expect(assetModel.exists).toHaveBeenCalledWith({
      beatId: 'b1',
      type: 'mp3',
    });
    expect(cartItemModel.findOneAndUpdate).toHaveBeenCalled();
  });
});
