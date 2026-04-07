import { Auth } from '@/auths/entities/auth.entity';
import { AuthsService } from '@/auths/providers/auths.service/auths.service';
import { handleError } from '@/common/error-handlers/error.handler';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SignupUserDto } from '../../dtos/signup-user.dto';
import { UserType } from '../../enums/user-type.enum';
import { User } from '../../entities/user.entity';

@Injectable()
export class SignupUserProvider {
  constructor(
    private dataSource: DataSource,
    @Inject(forwardRef(() => AuthsService))
    private readonly authService: AuthsService,
  ) {}

  async execute(signupUserDto: SignupUserDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      // Connect the query ryunner to the datasource
      await queryRunner.connect();
      // Start the transaction
      await queryRunner.startTransaction();
    } catch (error) {
      throw new RequestTimeoutException('Could not connect to the database');
    }
    try {
      const oldUser = await queryRunner.manager.findOne(User, {
        where: { email: signupUserDto.email },
      });

      if (oldUser) {
        throw new BadRequestException('User already exists');
      }

      let user: User | null = null;

      try {
        user = queryRunner.manager.create(User, {
          name: signupUserDto.name,
          email: signupUserDto.email,
          type: UserType.USER,
        });
        // Persist the user so it has an ID before creating permissions
        user = await queryRunner.manager.save(user);
      } catch (error) {
        throw new RequestTimeoutException('Failed to create user record');
      }

      try {
        await this.authService.createAuth(
          {
            email: signupUserDto.email,
            password: signupUserDto.password,
            user: user,
          },
          queryRunner,
        );
      } catch (error) {
        throw error;
      }

      await queryRunner.commitTransaction();
      return 'User created successfully';
    } catch (err) {
      await queryRunner.rollbackTransaction();
      handleError(err);
    } finally {
      await queryRunner.release();
    }
  }
}
