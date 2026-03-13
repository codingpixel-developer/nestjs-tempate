import { UserType } from '@/users/enums/user-type.enum';

export interface TokenPayload {
  id: number;
  email: string;
  userType: UserType;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}
