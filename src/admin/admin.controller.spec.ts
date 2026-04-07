import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './providers/admin.service/admin.service';
import { Admin } from './entities/admin.entity';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<
    Pick<AdminService, 'adminLogin' | 'changePassword'>
  >;

  beforeEach(async () => {
    adminService = {
      adminLogin: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  describe('login', () => {
    it('should call adminService.adminLogin with dto', async () => {
      const dto = { email: 'admin@example.com', password: 'Admin123!' };
      const response = {
        admin: { id: 1, email: 'admin@example.com' },
        tokens: { accessToken: 'at', refreshToken: 'rt' },
      };
      adminService.adminLogin.mockResolvedValue(response);

      const result = await controller.login(dto);

      expect(result).toEqual(response);
      expect(adminService.adminLogin).toHaveBeenCalledWith(dto);
    });
  });

  describe('changePassword', () => {
    it('should call adminService.changePassword with user and dto', async () => {
      const dto = { currentPassword: 'Old123!', newPassword: 'New456!' };
      const admin = { id: 1, email: 'admin@example.com' } as Admin;
      adminService.changePassword.mockResolvedValue(
        'Password has been changed successfully',
      );

      const result = await controller.changePassword(dto, admin);

      expect(result).toBe('Password has been changed successfully');
      expect(adminService.changePassword).toHaveBeenCalledWith(admin, dto);
    });
  });
});
