// ARCHITECTURAL NOTE: tout endpoint non-authentifié qui charge un User (ex: GET /users/:username public)
// doit appeler findActiveById (ou filtrer deletedAt: null manuellement) car il ne passe pas par
// JwtAccessStrategy.validate() qui est le seul endroit où le filtre est appliqué automatiquement.
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as argon2 from "argon2";
import { User, UserDocument } from "../database/schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email }).lean();
  }

  findById(id: string) {
    return this.userModel.findById(id).lean();
  }

  findActiveById(id: string) {
    return this.userModel.findOne({ _id: id, deletedAt: null }).lean();
  }

  async create(data: Partial<User>): Promise<User> {
    const created = await this.userModel.create(data);
    return created.toObject();
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    await this.userModel.updateOne({ _id: userId }, { refreshTokenHash }).exec();
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    // AUDIT: findById sans filtre deletedAt — cet endpoint est derrière JwtAccessGuard dont validate()
    // appelle findActiveById, donc un compte soft-deleted ne peut jamais atteindre cette méthode.
    const user = await this.userModel.findById(userId).lean();
    if (!user) return false;
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) return false;
    const passwordHash = await argon2.hash(newPassword);
    await this.userModel.updateOne({ _id: userId }, { passwordHash }).exec();
    return true;
  }

  async updateProfile(userId: string, data: { displayName?: string; avatarUrl?: string }) {
    const updates: Record<string, unknown> = {};
    if (data.displayName !== undefined) updates.displayName = data.displayName;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
    await this.userModel.updateOne({ _id: userId }, { $set: updates }).exec();
    return this.findActiveById(userId);
  }

  async softDelete(userId: string) {
    // Anonymise les PII dans la même opération atomique que le soft-delete (RGPD art. 17).
    // passwordHash conservé intentionnellement pour bloquer tout login résiduel.
    // L'email deleted-{id}@deleted.local préserve l'unicité de l'index et libère l'email original.
    await this.userModel
      .updateOne(
        { _id: userId },
        {
          $set: {
            deletedAt: new Date(),
            refreshTokenHash: null,
            email: `deleted-${userId}@deleted.local`,
            displayName: 'Deleted User',
            avatarUrl: null,
          },
        },
      )
      .exec();
  }
}
