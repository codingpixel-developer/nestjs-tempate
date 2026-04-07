import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { handleError } from '../../../common/error-handlers/error.handler';
import { ChangePasswordDto } from '../../dtos/change-password.dto';
import { ForgotPasswordDto } from '../../dtos/forgot-password.dto';
import { LoginDto } from '../../dtos/login.dto';
import { RefreshTokenDto } from '../../dtos/refresh-token.dto';
import { ResetPasswordDto } from '../../dtos/reset-password.dto';
import { Auth } from '../../entities/auth.entity';
import { AuthData } from '../../interfaces/auth-data.interface';
import { ChangePasswordProvider } from '../change-password.provider/change-password.provider';
import { ForgotPasswordProvider } from '../forgot-password.provider/forgot-password.provider';
import { HashingProvider } from '../hashing.provider';
import { LoginProvider } from '../login.provider/login.provider';
import { RefreshTokenProvider } from '../refresh-token.provider/refresh-token.provider';
import { ResetPasswordProvider } from '../reset-password.provider/reset-password.provider';

@Injectable()
export class AuthsService {
  constructor(
    private readonly hashingProvider: HashingProvider,
    private readonly loginProvider: LoginProvider,
    private readonly refreshTokenProvider: RefreshTokenProvider,
    private readonly forgotPasswordProvider: ForgotPasswordProvider,
    private readonly resetPasswordProvider: ResetPasswordProvider,
    private readonly changePasswordProvider: ChangePasswordProvider,
  ) {}

  async createAuth(
    authData: AuthData,
    queryRunner: QueryRunner,
  ): Promise<Auth> {
    try {
      // Hash password
      const hashedPassword = await this.hashingProvider.hashPassword(
        authData.password,
      );

      // Create auth record
      const auth = queryRunner.manager.create(Auth, {
        id: authData.user.id,
        email: authData.email,
        password: hashedPassword,
        user: authData.user,
      });

      // Save auth record
      return await queryRunner.manager.save(Auth, auth);
    } catch (error) {
      handleError(error);
      throw new RequestTimeoutException('Failed to create auth record');
    }
  }

  async login(loginDto: LoginDto) {
    let response = await this.loginProvider.execute(loginDto);
    return response;
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    return await this.refreshTokenProvider.execute(refreshTokenDto);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    return await this.forgotPasswordProvider.execute(forgotPasswordDto);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    return await this.resetPasswordProvider.execute(resetPasswordDto);
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    return await this.changePasswordProvider.execute(userId, changePasswordDto);
  }
}
