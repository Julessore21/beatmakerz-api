import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAccessGuard } from "../common/guards/jwt-access.guard";
import { CurrentUser, type RequestUser } from "../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@ApiTags('users')
@Controller('me')
@UseGuards(JwtAccessGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async me(@CurrentUser() user: RequestUser) {
    const profile = await this.usersService.findActiveById(user.userId);
    if (!profile) {
      throw new NotFoundException();
    }
    return {
      id: profile._id,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
    };
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    const ok = await this.usersService.updatePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    if (!ok) {
      throw new UnauthorizedException('Invalid current password');
    }
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(user.userId, dto);
    if (!updated) {
      throw new NotFoundException();
    }
    return {
      id: updated._id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      avatarUrl: updated.avatarUrl,
    };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: RequestUser) {
    await this.usersService.softDelete(user.userId);
  }
}
