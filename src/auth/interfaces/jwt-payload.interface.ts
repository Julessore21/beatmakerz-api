import { UserRoleEnum } from "../../database/schemas/user.schema";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRoleEnum;
}
