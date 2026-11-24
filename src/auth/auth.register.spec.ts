import { AuthService } from './auth.service';
import { UserRoleEnum } from '../database/schemas/user.schema';

describe('AuthService — inscription', () => {
  it('crée toujours un acheteur, même si on demande admin', async () => {
    const created: Record<string, unknown>[] = [];
    const userModel = {
      create: jest.fn((doc: Record<string, unknown>) => {
        created.push(doc);
        return Promise.resolve({
          ...doc,
          _id: 'u1',
          toObject: () => ({ ...doc, _id: 'u1' }),
        });
      }),
      updateOne: jest.fn(() => Promise.resolve({})),
    };
    const service = new AuthService(
      { findByEmail: jest.fn(() => Promise.resolve(null)) } as never,
      {
        signAsync: jest.fn(() => Promise.resolve('t')),
        sign: jest.fn(() => 't'),
      } as never,
      {
        get: jest.fn(() => '900'),
        getOrThrow: jest.fn(() => 'secret'),
      } as never,
      userModel as never,
      { create: jest.fn(() => Promise.resolve({})) } as never,
    );
    await service
      .register({
        email: 'a@b.fr',
        password: 'motdepasse1',
        displayName: 'Ab',
        role: UserRoleEnum.admin,
      })
      .catch(() => undefined);
    expect(created[0]?.role).toBe(UserRoleEnum.buyer);
  });
});
