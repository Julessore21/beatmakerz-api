import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

const mockUser = {
  _id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'buyer',
  avatarUrl: undefined,
  passwordHash: 'hashed',
};

const requestUser = { userId: 'user-1', email: 'test@example.com', role: 'buyer' };

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findActiveById: jest.fn(),
            updatePassword: jest.fn(),
            updateProfile: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  describe('GET /me', () => {
    it('returns profile for active user', async () => {
      service.findActiveById.mockResolvedValue(mockUser as any);
      const result = await controller.me(requestUser);
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'buyer',
        avatarUrl: undefined,
      });
    });

    it('throws 404 for soft-deleted user', async () => {
      service.findActiveById.mockResolvedValue(null);
      await expect(controller.me(requestUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /me/password', () => {
    it('returns void (204) on correct current password', async () => {
      service.updatePassword.mockResolvedValue(true);
      await expect(
        controller.changePassword(requestUser, { currentPassword: 'old', newPassword: 'newSecure123' }),
      ).resolves.toBeUndefined();
    });

    it('throws 401 on wrong current password', async () => {
      service.updatePassword.mockResolvedValue(false);
      await expect(
        controller.changePassword(requestUser, { currentPassword: 'wrong', newPassword: 'newSecure123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('PATCH /me', () => {
    it('returns updated profile with only provided fields changed', async () => {
      service.updateProfile.mockResolvedValue({ ...mockUser, displayName: 'Jules' } as any);
      const result = await controller.updateProfile(requestUser, { displayName: 'Jules' });
      expect(result.displayName).toBe('Jules');
      expect(result.email).toBe('test@example.com');
    });

    it('throws 404 when user not found after update', async () => {
      service.updateProfile.mockResolvedValue(null);
      await expect(
        controller.updateProfile(requestUser, { displayName: 'Jules' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /me', () => {
    it('calls softDelete and returns void (204)', async () => {
      service.softDelete.mockResolvedValue(undefined);
      await expect(controller.deleteAccount(requestUser)).resolves.toBeUndefined();
      expect(service.softDelete).toHaveBeenCalledWith('user-1');
    });
  });
});
