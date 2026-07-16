import jwtConfig from '@/config/jwt.config';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenStore } from '../refresh-token-store/refresh-token-store.service';

@Injectable()
export class LogoutProvider {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly refreshTokenStore: RefreshTokenStore,
  ) {}

  async logout(refreshToken: string): Promise<{ message: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        id: number;
        jti: string;
      }>(refreshToken, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });
      await this.refreshTokenStore.revoke(payload.id, payload.jti);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return { message: 'Logged out' };
  }

  async logoutAll(userId: number): Promise<{ message: string }> {
    await this.refreshTokenStore.revokeAll(userId);
    return { message: 'Logged out from all devices' };
  }
}
