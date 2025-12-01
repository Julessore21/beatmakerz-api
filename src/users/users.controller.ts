import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAccessGuard } from "../common/guards/jwt-access.guard";
import { CurrentUser, type RequestUser } from "../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";

@ApiTags('users')
@Controller('me')
@UseGuards(JwtAccessGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async me(@CurrentUser() user: RequestUser) {
    const profile = await this.usersService.findById(user.userId);
    if (!profile) {
      return null;
    }
    return {
      id: profile._id,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
    };
  }
}
