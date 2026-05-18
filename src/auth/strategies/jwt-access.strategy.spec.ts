import { UnauthorizedException } from '@nestjs/common';
import { JwtAccessStrategy } from './jwt-access.strategy';
import { UsersService } from '../../users/users.service';

const mockUser = { _id: 'u1', email: 'test@example.com', role: 'buyer' };
const mockPayload = {
  sub: 'u1',
  email: 'test@example.com',
  role: 'buyer' as any,
};

function buildStrategy(findActiveById: jest.Mock) {
  const configService = {
    get: jest.fn().mockReturnValue('test-secret'),
  } as any;
  const usersService = { findActiveById } as unknown as UsersService;
  return new JwtAccessStrategy(configService, usersService);
}

describe('JwtAccessStrategy.validate', () => {
  it('returns request user when account is active', async () => {
    const strategy = buildStrategy(jest.fn().mockResolvedValue(mockUser));
    const result = await strategy.validate(mockPayload);
    expect(result).toEqual({
      userId: 'u1',
      email: 'test@example.com',
      role: 'buyer',
    });
  });

  it('throws 401 when account is soft-deleted (findActiveById returns null)', async () => {
    const strategy = buildStrategy(jest.fn().mockResolvedValue(null));
    await expect(strategy.validate(mockPayload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws 401 when account does not exist', async () => {
    const strategy = buildStrategy(jest.fn().mockResolvedValue(undefined));
    await expect(strategy.validate(mockPayload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
