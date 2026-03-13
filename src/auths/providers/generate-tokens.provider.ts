import { handleError } from '@/common/error-handlers/error.handler';

import { User } from '@/users/entities/user.entity';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import jwtConfig from '../../config/jwt.config';
import { Auth } from '../entities/auth.entity';
import { ResetToken } from '../entities/reset-token.entity';
import { ActiveUserData } from '@/common/interfaces/active-user-data.interface';
import { Admin } from '@/admin/entities/admin.entity';

@Injectable()
export class GenerateTokensProvider {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    @InjectRepository(ResetToken)
    private readonly resetTokenRepository: Repository<ResetToken>,
  ) {}

  private async signToken<T>(
    userId: number,
    secret: string,
    expiresIn: number,
    payload?: T,
  ) {
    return await this.jwtService.signAsync(
      {
        id: userId,
        ...payload,
      },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret,
        expiresIn,
      },
    );
  }

  public async generateVerificationToken(user: User) {
    try {
      const verificationToken = await this.signToken(
        user.id,
        this.jwtConfiguration.secretVerification,
        this.jwtConfiguration.accessTokenTtl,
        { email: user.email },
      );

      return verificationToken;
    } catch (error) {
      handleError(error);
    }
  }

  public async generateLoginTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      // Generate Access Token with Email
      this.signToken<Partial<ActiveUserData>>(
        user.id,
        this.jwtConfiguration.secret,
        this.jwtConfiguration.accessTokenTtl,
        { email: user.email, type: user.type },
      ),

      // Generate Refresh token without email
      this.signToken(
        user.id,
        this.jwtConfiguration.secret,
        this.jwtConfiguration.refreshTokenTtl,
      ),
    ]);
    return {
      accessToken,
      refreshToken,
    };
  }

  public async generateResetPasswordToken(auth: Auth) {
    try {
      const resetPasswordToken = await this.signToken<Partial<ActiveUserData>>(
        auth.id,
        this.jwtConfiguration.secretResetPassword,
        this.jwtConfiguration.accessTokenTtl,
        { email: auth.email },
      );

      const existingToken = await this.resetTokenRepository.findOneBy({
        user: { id: auth.user.id },
      });
      // Calculate expiry (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      if (existingToken) {
        await this.resetTokenRepository.update(
          { user: { id: auth.user.id } },
          { token: resetPasswordToken, expiresAt },
        );
      } else {
        let newToken = this.resetTokenRepository.create({
          user: auth.user,
          token: resetPasswordToken,
          expiresAt,
        });
        await this.resetTokenRepository.save(newToken);
      }

      return resetPasswordToken;
    } catch (err) {
      handleError(err);
    }
  }

  public async generateAdminLoginTokens(admin: Admin) {
    const [accessToken, refreshToken] = await Promise.all([
      // Generate Access Token with Email and Admin flag
      this.signToken<Partial<ActiveUserData>>(
        admin.id,
        this.jwtConfiguration.secretAdmin,
        this.jwtConfiguration.accessTokenTtl,
        { email: admin.email, isAdmin: true },
      ),

      // Generate Refresh token with Admin flag
      this.signToken(
        admin.id,
        this.jwtConfiguration.secretAdmin,
        this.jwtConfiguration.refreshTokenTtl,
        { isAdmin: true },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
    };
  }
}
