import { UserType } from '@/users/enums/user-type.enum';

export interface ActiveUserData {
  id: number;
  email: string;
  type: UserType;
  isAdmin?: boolean;
}
