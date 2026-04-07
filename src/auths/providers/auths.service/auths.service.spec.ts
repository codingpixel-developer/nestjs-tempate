import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { AuthsService } from './auths.service';
import { HashingProvider } from '../hashing.provider';
import { LoginProvider } from '../login.provider/login.provider';
import { RefreshTokenProvider } from '../refresh-token.provider/refresh-token.provider';
import { ForgotPasswordProvider } from '../forgot-password.provider/forgot-password.provider';
import { ResetPasswordProvider } from '../reset-password.provider/reset-password.provider';
import { ChangePasswordProvider } from '../change-password.provider/change-password.provider';
import { Auth } from '../../entities/auth.entity';
import { AuthData } from '../../interfaces/auth-data.interface';
import { UserType } from '@/users/enums/user-type.enum';
import { User } from '@/users/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { ResetPasswordDto } from '../../dtos/reset-password.dto';

describe('AuthsService', () => {
  let service: AuthsService;
  let hashingProvider: jest.Mocked<
    Pick<HashingProvider, 'hashPassword' | 'comparePassword'>
  >;
  let loginProvider: jest.Mocked<Pick<LoginProvider, 'execute'>>;
  let refreshTokenProvider: jest.Mocked<Pick<RefreshTokenProvider, 'execute'>>;
  let forgotPasswordProvider: jest.Mocked<
    Pick<ForgotPasswordProvider, 'execute'>
  >;
  let resetPasswordProvider: jest.Mocked<
    Pick<ResetPasswordProvider, 'execute'>
  >;
  let changePasswordProvider: jest.Mocked<
    Pick<ChangePasswordProvider, 'execute'>
  >;

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    type: UserType.USER,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as User;

  const mockAuth: Auth = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword',
    user: mockUser,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockQueryRunner = {
    manager: {
      create: jest.fn(),
      save: jest.fn(),
    },
  } as unknown as QueryRunner & {
    manager: { create: jest.Mock; save: jest.Mock };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthsService,
        {
          provide: HashingProvider,
          useValue: {
            hashPassword: jest.fn(),
            comparePassword: jest.fn(),
          },
        },
        {
          provide: LoginProvider,
          useValue: { execute: jest.fn() },
        },
        {
          provide: RefreshTokenProvider,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ForgotPasswordProvider,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ResetPasswordProvider,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ChangePasswordProvider,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthsService>(AuthsService);
    hashingProvider = module.get(HashingProvider);
    loginProvider = module.get(LoginProvider);
    refreshTokenProvider = module.get(RefreshTokenProvider);
    forgotPasswordProvider = module.get(ForgotPasswordProvider);
    resetPasswordProvider = module.get(ResetPasswordProvider);
    changePasswordProvider = module.get(ChangePasswordProvider);
  });

  describe('createAuth', () => {
    const authData: AuthData = {
      email: 'test@example.com',
      password: 'plainPassword',
      user: mockUser,
    };

    it('should hash the password and save auth record', async () => {
      hashingProvider.hashPassword.mockResolvedValue('hashedPassword');
      mockQueryRunner.manager.create.mockReturnValue(mockAuth);
      mockQueryRunner.manager.save.mockResolvedValue(mockAuth);

      const result = await service.createAuth(authData, mockQueryRunner);

      expect(hashingProvider.hashPassword).toHaveBeenCalledWith(
        authData.password,
      );
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(Auth, {
        id: authData.user.id,
        email: authData.email,
        password: 'hashedPassword',
        user: authData.user,
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(Auth, mockAuth);
      expect(result).toEqual(mockAuth);
    });

    it('should throw when hashing fails', async () => {
      hashingProvider.hashPassword.mockRejectedValue(new Error('hash error'));

      await expect(
        service.createAuth(authData, mockQueryRunner),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw when save fails', async () => {
      hashingProvider.hashPassword.mockResolvedValue('hashedPassword');
      mockQueryRunner.manager.create.mockReturnValue(mockAuth);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('save error'));

      await expect(
        service.createAuth(authData, mockQueryRunner),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('login', () => {
    it('should delegate to loginProvider.execute', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const loginResult = {
        user: mockUser,
        tokens: { accessToken: 'access', refreshToken: 'refresh' },
      };
      loginProvider.execute.mockResolvedValue(loginResult);

      const result = await service.login(dto);

      expect(result).toEqual(loginResult);
      expect(loginProvider.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('refreshToken', () => {
    it('should delegate to refreshTokenProvider.execute', async () => {
      const dto = { refreshToken: 'some-token' };
      const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      refreshTokenProvider.execute.mockResolvedValue(tokens);

      const result = await service.refreshToken(dto);

      expect(result).toEqual(tokens);
      expect(refreshTokenProvider.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('forgotPassword', () => {
    it('should delegate to forgotPasswordProvider.execute', async () => {
      const dto = { email: 'test@example.com' };
      forgotPasswordProvider.execute.mockResolvedValue(
        'Reset password instructions sent to your email',
      );

      await service.forgotPassword(dto);

      expect(forgotPasswordProvider.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('resetPassword', () => {
    it('should delegate to resetPasswordProvider.execute', async () => {
      const dto: ResetPasswordDto = {
        token: 'reset-token',
        password: 'newPass123',
      };
      resetPasswordProvider.execute.mockResolvedValue(
        'Password has been reset successfully',
      );

      await service.resetPassword(dto);

      expect(resetPasswordProvider.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('changePassword', () => {
    it('should delegate to changePasswordProvider.execute', async () => {
      const dto = { currentPassword: 'oldPass', newPassword: 'newPass' };
      changePasswordProvider.execute.mockResolvedValue({
        message: 'Password changed successfully',
      });

      await service.changePassword(1, dto);

      expect(changePasswordProvider.execute).toHaveBeenCalledWith(1, dto);
    });
  });
});
