import jwtConfig from '@/config/jwt.config';

import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from '../../dtos/refresh-token.dto';
import { GenerateTokensProvider } from '../generate-tokens.provider/generate-tokens.provider';
import { UsersService } from '@/users/providers/users.service/users.service';
import { User } from '@/users/entities/user.entity';
import { RefreshTokenStore } from '../refresh-token-store/refresh-token-store.service';

@Injectable()
export class RefreshTokenProvider {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly generateTokensProvider: GenerateTokensProvider,
    /**
     * Inject jwtConfiguration
     */
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly refreshTokenStore: RefreshTokenStore,
  ) {}

  async execute(refreshTokenDto: RefreshTokenDto) {
    try {
      // Verify the refresh token
      const payload = await this.jwtService.verifyAsync<{
        id: number;
        jti: string;
      }>(refreshTokenDto.refreshToken, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });

      // Reject refresh tokens that have been revoked (logout / rotation)
      const isValid = await this.refreshTokenStore.isValid(
        payload.id,
        payload.jti,
      );
      if (!isValid) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Get user from payload
      const user: User | undefined | null = await this.usersService.findById(
        payload.id,
        [],
        {},
        true,
      );

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Rotate: revoke the used refresh token before issuing a new one
      await this.refreshTokenStore.revoke(payload.id, payload.jti);

      // Generate new tokens
      const { accessToken, refreshToken } =
        await this.generateTokensProvider.generateLoginTokens(user);

      return {
        accessToken,
        refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Session expired');
    }
  }
}
