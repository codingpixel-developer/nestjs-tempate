import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { GenerateTokensProvider } from './generate-tokens.provider';
import { ResetToken } from '../../entities/reset-token.entity';
import jwtConfig from '@/config/jwt.config';
import { UserType } from '@/users/enums/user-type.enum';
import { User } from '@/users/entities/user.entity';
import { Admin } from '@/admin/entities/admin.entity';
import { Auth } from '../../entities/auth.entity';

describe('GenerateTokensProvider', () => {
  let provider: GenerateTokensProvider;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let resetTokenRepository: jest.Mocked<
    Pick<Repository<ResetToken>, 'findOneBy' | 'update' | 'create' | 'save'>
  >;

  const jwtConfiguration = {
    secret: 'test-secret',
    secretAdmin: 'admin-secret',
    secretVerification: 'verify-secret',
    secretResetPassword: 'reset-secret',
    audience: 'test-audience',
    issuer: 'test-issuer',
    accessTokenTtl: 3600,
    refreshTokenTtl: 86400,
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    type: UserType.USER,
  } as unknown as User;

  const mockAdmin = {
    id: 10,
    email: 'admin@example.com',
  } as unknown as Admin;

  const mockAuth = {
    id: 1,
    email: 'test@example.com',
    user: { id: 1 },
  } as unknown as Auth;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateTokensProvider,
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn() },
        },
        {
          provide: jwtConfig.KEY,
          useValue: jwtConfiguration,
        },
        {
          provide: getRepositoryToken(ResetToken),
          useValue: {
            findOneBy: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    provider = module.get<GenerateTokensProvider>(GenerateTokensProvider);
    jwtService = module.get(JwtService);
    resetTokenRepository = module.get(getRepositoryToken(ResetToken));
  });

  describe('generateLoginTokens', () => {
    it('should return both accessToken and refreshToken', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await provider.generateLoginTokens(mockUser);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should sign access token with email, type, and user secret', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await provider.generateLoginTokens(mockUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { id: mockUser.id, email: mockUser.email, type: mockUser.type },
        {
          audience: jwtConfiguration.audience,
          issuer: jwtConfiguration.issuer,
          secret: jwtConfiguration.secret,
          expiresIn: jwtConfiguration.accessTokenTtl,
        },
      );
    });

    it('should sign refresh token with only id and correct TTL', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await provider.generateLoginTokens(mockUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { id: mockUser.id },
        {
          audience: jwtConfiguration.audience,
          issuer: jwtConfiguration.issuer,
          secret: jwtConfiguration.secret,
          expiresIn: jwtConfiguration.refreshTokenTtl,
        },
      );
    });
  });

  describe('generateAdminLoginTokens', () => {
    it('should return both accessToken and refreshToken', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('admin-access')
        .mockResolvedValueOnce('admin-refresh');

      const result = await provider.generateAdminLoginTokens(mockAdmin);

      expect(result).toEqual({
        accessToken: 'admin-access',
        refreshToken: 'admin-refresh',
      });
    });

    it('should sign access token with admin secret and isAdmin flag', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('admin-access')
        .mockResolvedValueOnce('admin-refresh');

      await provider.generateAdminLoginTokens(mockAdmin);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { id: mockAdmin.id, email: mockAdmin.email, isAdmin: true },
        {
          audience: jwtConfiguration.audience,
          issuer: jwtConfiguration.issuer,
          secret: jwtConfiguration.secretAdmin,
          expiresIn: jwtConfiguration.accessTokenTtl,
        },
      );
    });

    it('should sign refresh token with admin secret and isAdmin flag', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('admin-access')
        .mockResolvedValueOnce('admin-refresh');

      await provider.generateAdminLoginTokens(mockAdmin);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { id: mockAdmin.id, isAdmin: true },
        {
          audience: jwtConfiguration.audience,
          issuer: jwtConfiguration.issuer,
          secret: jwtConfiguration.secretAdmin,
          expiresIn: jwtConfiguration.refreshTokenTtl,
        },
      );
    });
  });

  describe('generateResetPasswordToken', () => {
    it('should create a new token when none exists', async () => {
      jwtService.signAsync.mockResolvedValue('reset-token');
      resetTokenRepository.findOneBy.mockResolvedValue(null);
      const createdToken = { token: 'reset-token' } as unknown as ResetToken;
      resetTokenRepository.create.mockReturnValue(createdToken);
      resetTokenRepository.save.mockResolvedValue(createdToken);

      const result = await provider.generateResetPasswordToken(mockAuth);

      expect(result).toBe('reset-token');
      expect(resetTokenRepository.findOneBy).toHaveBeenCalledWith({
        user: { id: mockAuth.user.id },
      });
      expect(resetTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockAuth.user,
          token: 'reset-token',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresAt: expect.any(Date),
        }),
      );
      expect(resetTokenRepository.save).toHaveBeenCalledWith(createdToken);
      expect(resetTokenRepository.update).not.toHaveBeenCalled();
    });

    it('should update existing token when one already exists', async () => {
      jwtService.signAsync.mockResolvedValue('new-reset-token');
      resetTokenRepository.findOneBy.mockResolvedValue({
        id: 5,
        token: 'old-token',
      } as unknown as ResetToken);

      const result = await provider.generateResetPasswordToken(mockAuth);

      expect(result).toBe('new-reset-token');
      expect(resetTokenRepository.update).toHaveBeenCalledWith(
        { user: { id: mockAuth.user.id } },
        expect.objectContaining({
          token: 'new-reset-token',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresAt: expect.any(Date),
        }),
      );
      expect(resetTokenRepository.create).not.toHaveBeenCalled();
    });

    it('should use reset password secret', async () => {
      jwtService.signAsync.mockResolvedValue('reset-token');
      resetTokenRepository.findOneBy.mockResolvedValue(null);
      resetTokenRepository.create.mockReturnValue({} as unknown as ResetToken);
      resetTokenRepository.save.mockResolvedValue({} as unknown as ResetToken);

      await provider.generateResetPasswordToken(mockAuth);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { id: mockAuth.id, email: mockAuth.email },
        expect.objectContaining({
          secret: jwtConfiguration.secretResetPassword,
        }),
      );
    });
  });

  describe('generateVerificationToken', () => {
    it('should return the verification token', async () => {
      jwtService.signAsync.mockResolvedValue('verify-token');

      const result = await provider.generateVerificationToken(mockUser);

      expect(result).toBe('verify-token');
    });

    it('should use verification secret', async () => {
      jwtService.signAsync.mockResolvedValue('verify-token');

      await provider.generateVerificationToken(mockUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { id: mockUser.id, email: mockUser.email },
        expect.objectContaining({
          secret: jwtConfiguration.secretVerification,
          expiresIn: jwtConfiguration.accessTokenTtl,
        }),
      );
    });
  });
});
