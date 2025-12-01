import { SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '../../database/schemas/user.schema';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (UserRoleEnum | string)[]) => SetMetadata(ROLES_KEY, roles);
