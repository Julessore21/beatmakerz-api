import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from '../database/schemas/user.schema';

function buildExecMock(resolvedValue: Record<string, unknown> = {}) {
  return jest
    .fn()
    .mockReturnValue({ exec: jest.fn().mockResolvedValue(resolvedValue) });
}

describe('UsersService.softDelete', () => {
  let service: UsersService;
  let updateOneMock: jest.Mock;

  beforeEach(async () => {
    updateOneMock = buildExecMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: {
            findById: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            updateOne: updateOneMock,
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('anonymises all PII fields atomically with deletedAt', async () => {
    await service.softDelete('user-abc');

    expect(updateOneMock).toHaveBeenCalledWith(
      { _id: 'user-abc' },
      {
        $set: {
          deletedAt: expect.any(Date),
          refreshTokenHash: null,
          email: 'deleted-user-abc@deleted.local',
          displayName: 'Deleted User',
          avatarUrl: null,
        },
      },
    );
  });

  it('uses a single $set (atomic operation, not multiple queries)', async () => {
    await service.softDelete('user-abc');
    expect(updateOneMock).toHaveBeenCalledTimes(1);
  });

  it('does not touch any Order or Cart collection', async () => {
    // updateOneMock is the only write method exposed on the mock userModel.
    // A single call means softDelete is scoped to the user document.
    await service.softDelete('user-abc');
    expect(updateOneMock).toHaveBeenCalledTimes(1);
  });

  it('preserves _id (used as FK by Orders)', async () => {
    await service.softDelete('user-abc');
    const [, secondArg] = updateOneMock.mock.calls[0] as [
      unknown,
      { $set: Record<string, unknown> },
    ];
    expect(secondArg.$set).not.toHaveProperty('_id');
  });

  it('preserves passwordHash (not in $set payload)', async () => {
    await service.softDelete('user-abc');
    const [, secondArg] = updateOneMock.mock.calls[0] as [
      unknown,
      { $set: Record<string, unknown> },
    ];
    expect(secondArg.$set).not.toHaveProperty('passwordHash');
  });
});
