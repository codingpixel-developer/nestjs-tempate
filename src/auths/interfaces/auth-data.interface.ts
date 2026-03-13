import { User } from '@/users/entities/user.entity';

export interface AuthData {
  email: string;
  password: string;
  user: User;
}
