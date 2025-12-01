import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
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

  async create(data: Partial<User>): Promise<User> {
    const created = await this.userModel.create(data);
    return created.toObject();
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    await this.userModel.updateOne({ _id: userId }, { refreshTokenHash }).exec();
  }
}
