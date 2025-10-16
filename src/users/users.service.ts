import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateUserInput extends Prisma.UserCreateInput {}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }
}
