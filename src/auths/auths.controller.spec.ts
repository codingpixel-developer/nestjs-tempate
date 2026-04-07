import { Test, TestingModule } from '@nestjs/testing';
import { AuthsController } from './auths.controller';
import { AuthsService } from './providers/auths.service/auths.service';
import { User } from '@/users/entities/user.entity';

describe('AuthsController', () => {
  let controller: AuthsController;
  let authsService: jest.Mocked<
    Pick<
      AuthsService,
      | 'login'
      | 'refreshToken'
      | 'forgotPassword'
      | 'resetPassword'
      | 'changePassword'
    >
  >;

  beforeEach(async () => {
    authsService = {
      login: jest.fn(),
      refreshToken: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthsController],
      providers: [{ provide: AuthsService, useValue: authsService }],
    }).compile();

    controller = module.get<AuthsController>(AuthsController);
  });

  describe('login', () => {
    it('should call authService.login with dto and return result', async () => {
      const dto = { email: 'test@example.com', password: 'Pass1234' };
      const response = {
        user: { id: 1 },
        tokens: { accessToken: 'at', refreshToken: 'rt' },
      };
      authsService.login.mockResolvedValue(response);

      const result = await controller.login(dto);

      expect(authsService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(response);
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken with dto and return result', async () => {
      const dto = { refreshToken: 'rt' };
      const response = { accessToken: 'new-at', refreshToken: 'new-rt' };
      authsService.refreshToken.mockResolvedValue(response);

      const result = await controller.refreshToken(dto);

      expect(authsService.refreshToken).toHaveBeenCalledWith(dto);
      expect(result).toEqual(response);
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with dto and return result', async () => {
      const dto = { email: 'test@example.com' };
      authsService.forgotPassword.mockResolvedValue('Email sent');

      const result = await controller.forgotPassword(dto);

      expect(authsService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(result).toBe('Email sent');
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword with dto and return result', async () => {
      const dto = { token: 'jwt-token', password: 'NewPass1!' };
      authsService.resetPassword.mockResolvedValue('Password reset');

      const result = await controller.resetPassword(dto);

      expect(authsService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toBe('Password reset');
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword with user.id and dto', async () => {
      const dto = { currentPassword: 'old', newPassword: 'NewPass1!' };
      const user = { id: 1 } as unknown as User;
      const response = { message: 'Password changed successfully' };
      authsService.changePassword.mockResolvedValue(response);

      const result = await controller.changePassword(user, dto);

      expect(authsService.changePassword).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(response);
    });
  });
});
