import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AuthTokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthTokensDto })
  tokens!: AuthTokensDto;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;
}
