import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenProvider } from './refresh-token.provider';
import { GenerateTokensProvider } from '../generate-tokens.provider/generate-tokens.provider';
import { UsersService } from '@/users/providers/users.service/users.service';
import { UserType } from '@/users/enums/user-type.enum';
import { User } from '@/users/entities/user.entity';
import jwtConfig from '@/config/jwt.config';

describe('RefreshTokenProvider', () => {
  let provider: RefreshTokenProvider;
  let jwtService: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'findById'>>;
  let generateTokensProvider: jest.Mocked<
    Pick<GenerateTokensProvider, 'generateLoginTokens'>
  >;

  const jwtConfiguration = {
    secret: 'test-secret',
    audience: 'test-audience',
    issuer: 'test-issuer',
  };

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    type: UserType.USER,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as User;

  const refreshTokenDto = { refreshToken: 'valid-refresh-token' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenProvider,
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: UsersService,
          useValue: { findById: jest.fn() },
        },
        {
          provide: GenerateTokensProvider,
          useValue: { generateLoginTokens: jest.fn() },
        },
        {
          provide: jwtConfig.KEY,
          useValue: jwtConfiguration,
        },
      ],
    }).compile();

    provider = module.get<RefreshTokenProvider>(RefreshTokenProvider);
    jwtService = module.get(JwtService);
    usersService = module.get(UsersService);
    generateTokensProvider = module.get(GenerateTokensProvider);
  });

  it('should return new tokens on successful refresh', async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: 1 });
    usersService.findById.mockResolvedValue(mockUser);
    generateTokensProvider.generateLoginTokens.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    const result = await provider.execute(refreshTokenDto);

    expect(result).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
  });

  it('should verify token with correct secret, audience, and issuer', async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: 1 });
    usersService.findById.mockResolvedValue(mockUser);
    generateTokensProvider.generateLoginTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    });

    await provider.execute(refreshTokenDto);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      refreshTokenDto.refreshToken,
      {
        secret: jwtConfiguration.secret,
        audience: jwtConfiguration.audience,
        issuer: jwtConfiguration.issuer,
      },
    );
  });

  it('should call findById with throwUnauthorized=true', async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: 1 });
    usersService.findById.mockResolvedValue(mockUser);
    generateTokensProvider.generateLoginTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    });

    await provider.execute(refreshTokenDto);

    expect(usersService.findById).toHaveBeenCalledWith(1, [], {}, true);
  });

  it('should throw UnauthorizedException when token verification fails', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(provider.execute(refreshTokenDto)).rejects.toThrow(
      new UnauthorizedException('Session expired'),
    );
  });

  it('should throw UnauthorizedException when user not found', async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: 999 });
    usersService.findById.mockResolvedValue(undefined);

    await expect(provider.execute(refreshTokenDto)).rejects.toThrow(
      new UnauthorizedException('Session expired'),
    );
  });

  it('should generate new tokens for the found user', async () => {
    jwtService.verifyAsync.mockResolvedValue({ id: 1 });
    usersService.findById.mockResolvedValue(mockUser);
    generateTokensProvider.generateLoginTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    });

    await provider.execute(refreshTokenDto);

    expect(generateTokensProvider.generateLoginTokens).toHaveBeenCalledWith(
      mockUser,
    );
  });
});
