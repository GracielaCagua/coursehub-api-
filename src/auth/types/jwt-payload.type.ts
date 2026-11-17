import { UserRole } from '../../users/user-role.enum';

export type JwtPayload = {
  sub: number;
  email: string;
  role: UserRole;
};

export type AuthenticatedUser = {
  id: number;
  email: string;
  role: UserRole;
};
