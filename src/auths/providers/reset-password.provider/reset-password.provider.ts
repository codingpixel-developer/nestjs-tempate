import {
  Inject,
  Injectable,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import { Auth } from '../../entities/auth.entity';
import { ResetToken } from '../../entities/reset-token.entity';
import { ResetPasswordDto } from '../../dtos/reset-password.dto';
import { HashingProvider } from '../hashing.provider';
import { handleError } from '@/common/error-handlers/error.handler';
import jwtConfig from '@/config/jwt.config';
import { User } from '@/users/entities/user.entity';

@Injectable()
export class ResetPasswordProvider {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly hashingProvider: HashingProvider,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    @InjectRepository(ResetToken)
    private readonly resetTokenRepository: Repository<ResetToken>,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async execute(resetPasswordDto: ResetPasswordDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      // Connect the query runner to the datasource
      await queryRunner.connect();
      // Start the transaction
      await queryRunner.startTransaction();
    } catch (error) {
      throw new RequestTimeoutException('Could not connect to the database');
    }

    try {
      // Find reset token
      let resetToken: ResetToken | null = null;
      try {
        resetToken = await this.resetTokenRepository.findOne({
          where: { token: resetPasswordDto.token },
          relations: ['user'],
        });
      } catch (err) {
        handleError(err);
      }

      if (!resetToken) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        await queryRunner.manager.delete(ResetToken, { id: resetToken.id });
        await queryRunner.commitTransaction();
        throw new UnauthorizedException('Reset token has expired');
      }

      // Verify JWT token
      try {
        const payload = await this.jwtService.verifyAsync(
          resetPasswordDto.token,
          {
            secret: this.jwtConfiguration.secretResetPassword,
            audience: this.jwtConfiguration.audience,
            issuer: this.jwtConfiguration.issuer,
          },
        );

        if (!payload?.id) {
          throw new UnauthorizedException('Invalid reset token');
        }
      } catch (err) {
        throw new UnauthorizedException('Invalid reset token');
      }

      // Find auth record
      let auth: Auth | null = null;
      try {
        auth = await this.authRepository.findOne({
          where: { user: { id: resetToken.user.id } },
          relations: ['user'],
        });
      } catch (err) {
        handleError(err);
      }

      if (!auth) {
        throw new UnauthorizedException('User not found');
      }

      // Hash new password
      const hashedPassword = await this.hashingProvider.hashPassword(
        resetPasswordDto.password,
      );

      // Update password and delete reset token
      auth.password = hashedPassword;
      await queryRunner.manager.save(Auth, auth);
      await queryRunner.manager.delete(ResetToken, { id: resetToken.id });
      await queryRunner.manager.save(User, auth.user);
      await queryRunner.commitTransaction();
      return 'Password has been reset successfully';
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      try {
        await queryRunner.release();
      } catch (error) {
        handleError(error);
      }
    }
  }
}
