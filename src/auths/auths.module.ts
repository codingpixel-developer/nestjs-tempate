import { forwardRef, Module } from '@nestjs/common';
import { AuthsController } from './auths.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { ResetToken } from './entities/reset-token.entity';
import { AuthsService } from './providers/auths.service';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from '@/config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '@/users/users.module';
import { HashingProvider } from './providers/hashing.provider';
import { BcryptProvider } from './providers/bcrypt.provider';
import { ChangePasswordProvider } from './providers/change-password.provider';
import { ResetPasswordProvider } from './providers/reset-password.provider';
import { ForgotPasswordProvider } from './providers/forgot-password.provider';
import { RefreshTokenProvider } from './providers/refresh-token.provider';
import { LoginProvider } from './providers/login.provider';
import { GenerateTokensProvider } from './providers/generate-tokens.provider';

@Module({
  controllers: [AuthsController],
  imports: [
    TypeOrmModule.forFeature([Auth, ResetToken]),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    forwardRef(() => UsersModule),
  ],
  providers: [
    AuthsService,
    GenerateTokensProvider,
    LoginProvider,
    RefreshTokenProvider,
    ForgotPasswordProvider,
    ResetPasswordProvider,
    ChangePasswordProvider,
    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },
  ],
  exports: [TypeOrmModule, AuthsService, HashingProvider],
})
export class AuthsModule {}
