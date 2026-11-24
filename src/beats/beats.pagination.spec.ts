import { BeatsService } from './beats.service';

const chain = <T>(v: T) => {
  const q = {
    sort: () => q,
    limit: () => q,
    select: () => q,
    lean: () => Promise.resolve(v),
  };
  return q;
};

describe('BeatsService — pagination', () => {
  const build = () => {
    const at = new Date('2026-11-01T10:00:00Z');
    const beatModel = {
      find: jest.fn(() => chain([])),
      findById: jest.fn(() => chain({ _id: 'b9', createdAt: at })),
    };
    const empty = {
      find: jest.fn(() => chain([])),
      findOne: jest.fn(() => chain(null)),
    };
    const service = new BeatsService(
      beatModel as never,
      empty as never,
      empty as never,
      empty as never,
      empty as never,
      {} as never,
      {} as never,
    );
    return { service, beatModel, at };
  };

  it('la page suivante part du curseur, dans un ordre stable', async () => {
    const { service, beatModel, at } = build();
    await service.listBeats({ cursor: 'b9', limit: 20 } as never);
    expect(beatModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [
          { createdAt: { $lt: at } },
          { createdAt: at, _id: { $lte: 'b9' } },
        ],
      }),
    );
  });

  it('garde la recherche avec le curseur (les deux conditions)', async () => {
    const { service, beatModel } = build();
    await service.listBeats({
      cursor: 'b9',
      query: 'drill',
      limit: 20,
    } as never);
    const filter = (
      beatModel.find.mock.calls[0] as unknown as [Record<string, unknown>]
    )[0];
    expect(filter.$and).toHaveLength(2);
  });
});
