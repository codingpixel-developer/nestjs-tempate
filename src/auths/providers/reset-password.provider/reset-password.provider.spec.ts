import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RequestTimeoutException, UnauthorizedException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ResetPasswordProvider } from './reset-password.provider';
import { Auth } from '../../entities/auth.entity';
import { ResetToken } from '../../entities/reset-token.entity';
import { HashingProvider } from '../hashing.provider';
import jwtConfig from '@/config/jwt.config';

describe('ResetPasswordProvider', () => {
  let provider: ResetPasswordProvider;
  let resetTokenRepository: jest.Mocked<
    Pick<Repository<ResetToken>, 'findOne'>
  >;
  let authRepository: jest.Mocked<Pick<Repository<Auth>, 'findOne'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;
  let hashingProvider: jest.Mocked<Pick<HashingProvider, 'hashPassword'>>;
  let mockQueryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: { save: jest.Mock; delete: jest.Mock };
  };
  const jwtConfiguration = {
    secretResetPassword: 'reset-secret',
    audience: 'test-audience',
    issuer: 'test-issuer',
  };

  const mockUser = { id: 1, email: 'user@example.com', name: 'Test User' };
  const mockResetToken = {
    id: 1,
    token: 'valid-jwt-token',
    expiresAt: new Date(Date.now() + 3600000),
    user: mockUser,
  } as ResetToken;
  const mockAuth = {
    id: 1,
    email: 'user@example.com',
    password: 'oldHashedPassword',
    user: mockUser,
  } as Auth;

  const resetPasswordDto = {
    token: 'valid-jwt-token',
    password: 'newPassword1!',
  };

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: { save: jest.fn(), delete: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordProvider,
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: HashingProvider,
          useValue: { hashPassword: jest.fn() },
        },
        {
          provide: getRepositoryToken(Auth),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ResetToken),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: jwtConfig.KEY,
          useValue: jwtConfiguration,
        },
      ],
    }).compile();

    provider = module.get<ResetPasswordProvider>(ResetPasswordProvider);
    module.get(DataSource);
    resetTokenRepository = module.get(getRepositoryToken(ResetToken));
    authRepository = module.get(getRepositoryToken(Auth));
    jwtService = module.get(JwtService);
    hashingProvider = module.get(HashingProvider);
  });

  function setupHappyPath() {
    resetTokenRepository.findOne.mockResolvedValue(mockResetToken);
    jwtService.verifyAsync.mockResolvedValue({ id: mockUser.id });
    authRepository.findOne.mockResolvedValue({ ...mockAuth });
    hashingProvider.hashPassword.mockResolvedValue('newHashedPassword');
    mockQueryRunner.manager.save.mockResolvedValue(undefined);
    mockQueryRunner.manager.delete.mockResolvedValue(undefined);
  }

  it('should reset password successfully', async () => {
    setupHappyPath();

    const result = await provider.execute(resetPasswordDto);

    expect(result).toBe('Password has been reset successfully');
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should throw RequestTimeoutException when DB connection fails', async () => {
    mockQueryRunner.connect.mockRejectedValue(new Error('Connection failed'));

    await expect(provider.execute(resetPasswordDto)).rejects.toThrow(
      new RequestTimeoutException('Could not connect to the database'),
    );
  });

  it('should throw UnauthorizedException when reset token not found', async () => {
    resetTokenRepository.findOne.mockResolvedValue(null);

    await expect(provider.execute(resetPasswordDto)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired reset token'),
    );
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('should find reset token with user relation', async () => {
    setupHappyPath();

    await provider.execute(resetPasswordDto);

    expect(resetTokenRepository.findOne).toHaveBeenCalledWith({
      where: { token: resetPasswordDto.token },
      relations: ['user'],
    });
  });

  it('should delete expired token, commit, then throw', async () => {
    const expiredToken = {
      ...mockResetToken,
      expiresAt: new Date(Date.now() - 3600000),
    };
    resetTokenRepository.findOne.mockResolvedValue(expiredToken);

    await expect(provider.execute(resetPasswordDto)).rejects.toThrow(
      new UnauthorizedException('Reset token has expired'),
    );
    expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(ResetToken, {
      id: expiredToken.id,
    });
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when JWT verification fails', async () => {
    resetTokenRepository.findOne.mockResolvedValue(mockResetToken);
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid JWT'));

    await expect(provider.execute(resetPasswordDto)).rejects.toThrow(
      new UnauthorizedException('Invalid reset token'),
    );
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('should verify JWT with reset password secret', async () => {
    setupHappyPath();

    await provider.execute(resetPasswordDto);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      resetPasswordDto.token,
      {
        secret: jwtConfiguration.secretResetPassword,
        audience: jwtConfiguration.audience,
        issuer: jwtConfiguration.issuer,
      },
    );
  });

  it('should throw UnauthorizedException when JWT payload has no id', async () => {
    resetTokenRepository.findOne.mockResolvedValue(mockResetToken);
    jwtService.verifyAsync.mockResolvedValue({});

    await expect(provider.execute(resetPasswordDto)).rejects.toThrow(
      new UnauthorizedException('Invalid reset token'),
    );
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when auth not found', async () => {
    resetTokenRepository.findOne.mockResolvedValue(mockResetToken);
    jwtService.verifyAsync.mockResolvedValue({ id: mockUser.id });
    authRepository.findOne.mockResolvedValue(null);

    await expect(provider.execute(resetPasswordDto)).rejects.toThrow(
      new UnauthorizedException('User not found'),
    );
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('should rollback on error and release queryRunner', async () => {
    resetTokenRepository.findOne.mockRejectedValue(new Error('DB error'));

    await expect(provider.execute(resetPasswordDto)).rejects.toThrow();

    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should delete reset token after successful password reset', async () => {
    setupHappyPath();

    await provider.execute(resetPasswordDto);

    expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(ResetToken, {
      id: mockResetToken.id,
    });
  });
});
