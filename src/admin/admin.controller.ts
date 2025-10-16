import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { CreateBeatDto, CreateAssetDto, UpdateBeatDto } from './dto/create-beat.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.seller)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('beats')
  createBeat(@CurrentUser() user: RequestUser, @Body() dto: CreateBeatDto) {
    return this.adminService.createBeat(user.userId, user.role as UserRole, dto);
  }

  @Patch('beats/:id')
  updateBeat(@CurrentUser() user: RequestUser, @Param('id') beatId: string, @Body() dto: UpdateBeatDto) {
    return this.adminService.updateBeat(user.userId, user.role as UserRole, beatId, dto);
  }

  @Post('beats/:id/assets')
  createAsset(
    @CurrentUser() user: RequestUser,
    @Param('id') beatId: string,
    @Body() dto: CreateAssetDto,
  ) {
    return this.adminService.createAsset(user.userId, user.role as UserRole, beatId, dto);
  }
}
