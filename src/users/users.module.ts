import { AuthsModule } from '@/auths/auths.module';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { SignupUserProvider } from './providers/signup-user.provider';
import { UpdateUserProvider } from './providers/update-user.provider';
import { UsersService } from './providers/users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthsModule)],
  controllers: [UsersController],
  providers: [UsersService, SignupUserProvider, UpdateUserProvider],
  exports: [UsersService],
})
export class UsersModule {}
