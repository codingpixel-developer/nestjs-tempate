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
  ) {}

  async execute(refreshTokenDto: RefreshTokenDto) {
    try {
      // Verify the refresh token
      const payload = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        {
          secret: this.jwtConfiguration.secret,
          audience: this.jwtConfiguration.audience,
          issuer: this.jwtConfiguration.issuer,
        },
      );

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

      // Generate new tokens
      const { accessToken, refreshToken } =
        await this.generateTokensProvider.generateLoginTokens(user);

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Session expired');
    }
  }
}
