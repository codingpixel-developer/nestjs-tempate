import { handleError } from '@/common/error-handlers/error.handler';
import { ActiveUserData } from '@/common/interfaces/active-user-data.interface';
import {
  Injectable,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UpdateCurrentUserDto } from '../../dtos/update-current-user.dto';
import { User } from '../../entities/user.entity';

@Injectable()
export class UpdateUserProvider {
  constructor(private dataSource: DataSource) {}

  async execute(
    updateUserDto: UpdateCurrentUserDto,
    activeUser: ActiveUserData,
  ) {
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
      let user: User | null = await queryRunner.manager.findOne(User, {
        where: { id: activeUser.id },
      });
      if (!user) {
        throw new UnauthorizedException('Unauthorized');
      }
      user.name = updateUserDto.name ?? user.name;
      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();
      return 'User updated successfully';
    } catch (err) {
      await queryRunner.rollbackTransaction();
      handleError(err);
    } finally {
      await queryRunner.release();
    }
  }
}
