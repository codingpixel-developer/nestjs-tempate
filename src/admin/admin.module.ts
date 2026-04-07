import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { Admin } from './entities/admin.entity';
import { AdminController } from './admin.controller';
import { AdminLoginProvider } from './providers/admin-login.provider/admin-login.provider';
import { HashingProvider } from '@/auths/providers/hashing.provider';
import { BcryptProvider } from '@/auths/providers/bcrypt.provider/bcrypt.provider';
import { GenerateTokensProvider } from '@/auths/providers/generate-tokens.provider/generate-tokens.provider';
import { ResetToken } from '@/auths/entities/reset-token.entity';
import jwtConfig from '../config/jwt.config';
import { AdminService } from './providers/admin.service/admin.service';
import { UsersModule } from '@/users/users.module';
import { PaginationProvider } from '@/common/pagination/providers/pagination.provider';
import { AdminChangePasswordProvider } from '@/admin/providers/admin-change-password.provider/admin-change-password.provider';
import { AuthsModule } from '@/auths/auths.module';
import { User } from '@/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, ResetToken, User]),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    forwardRef(() => UsersModule),
    forwardRef(() => AuthsModule),
  ],
  controllers: [AdminController],
  providers: [
    AdminLoginProvider,
    GenerateTokensProvider,
    AdminService,
    PaginationProvider,
    AdminChangePasswordProvider,
    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },
  ],
  exports: [TypeOrmModule, AdminService],
})
export class AdminModule {}
