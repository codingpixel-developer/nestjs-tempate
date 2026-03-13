import { handleError } from '@/common/error-handlers/error.handler';
import { ActiveUserData } from '@/common/interfaces/active-user-data.interface';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { SignupUserDto } from '../dtos/signup-user.dto';
import { UpdateCurrentUserDto } from '../dtos/update-current-user.dto';
import { User } from '../entities/user.entity';
import { SignupUserProvider } from './signup-user.provider';
import { UpdateUserProvider } from './update-user.provider';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly signupUserProvider: SignupUserProvider,
    private readonly updateUserProvider: UpdateUserProvider,
  ) {}

  async findById(
    id: number,
    relations: string[] = [],
    where: FindOptionsWhere<User> = {},
    throwUnauthorized: boolean = false,
  ) {
    try {
      if (id) {
        let user = await this.usersRepository.findOne({
          where: { id: id, ...where },
          relations,
        });

        if (!user) {
          if (throwUnauthorized) {
            throw new UnauthorizedException('User not found');
          } else {
            throw new NotFoundException('User not found');
          }
        }

        return user;
      } else {
        if (throwUnauthorized) {
          throw new UnauthorizedException('User not found');
        } else {
          throw new NotFoundException('User not found');
        }
      }
    } catch (err) {
      handleError(err);
    }
  }

  async signupUser(signupUserDto: SignupUserDto) {
    return await this.signupUserProvider.execute(signupUserDto);
  }

  async updateCurrentUser(
    updateUserDto: UpdateCurrentUserDto,
    activeUser: ActiveUserData,
  ) {
    return await this.updateUserProvider.execute(updateUserDto, activeUser);
  }
}
