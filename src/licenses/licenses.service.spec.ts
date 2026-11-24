import {
  basicCentsFromEnv,
  DEFAULT_BASIC_CENTS,
  LicensesService,
} from './licenses.service';

describe('LicensesService', () => {
  const model = (existing: unknown) => {
    const m = {
      findOne: jest.fn(() => ({ lean: () => Promise.resolve(existing) })),
      create: jest.fn(() => Promise.resolve({})),
      updateOne: jest.fn(() => Promise.resolve({})),
    };
    return m;
  };

  it('prend 9,99 € par défaut et refuse un prix illisible', () => {
    expect(basicCentsFromEnv(undefined)).toBe(DEFAULT_BASIC_CENTS);
    expect(basicCentsFromEnv('abc')).toBe(DEFAULT_BASIC_CENTS);
    expect(basicCentsFromEnv('-5')).toBe(DEFAULT_BASIC_CENTS);
    expect(basicCentsFromEnv('1499')).toBe(1499);
  });

  it('crée la licence Basic sur une base neuve', async () => {
    const m = model(null);
    await new LicensesService(m as never).ensureBasic(undefined);
    expect(m.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'Basic',
        priceCents: 999,
        currency: 'EUR',
      }),
    );
  });

  it('suit le prix réglé, sans toucher à une licence déjà là quand rien n’est réglé', async () => {
    const m = model({ _id: 'b', priceCents: 999 });
    await new LicensesService(m as never).ensureBasic(undefined);
    expect(m.updateOne).not.toHaveBeenCalled();
    await new LicensesService(m as never).ensureBasic('1299');
    expect(m.updateOne).toHaveBeenCalledWith(
      { _id: 'b' },
      { $set: { priceCents: 1299 } },
    );
  });
});
