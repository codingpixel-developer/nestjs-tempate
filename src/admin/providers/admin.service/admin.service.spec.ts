import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdminService } from './admin.service';
import { AdminLoginProvider } from '../admin-login.provider/admin-login.provider';
import { AdminChangePasswordProvider } from '../admin-change-password.provider/admin-change-password.provider';
import { Admin } from '../../entities/admin.entity';

describe('AdminService', () => {
  let service: AdminService;
  let adminsRepository: jest.Mocked<Pick<Repository<Admin>, 'findOne'>>;
  let adminLoginProvider: jest.Mocked<Pick<AdminLoginProvider, 'execute'>>;
  let adminChangePasswordProvider: jest.Mocked<
    Pick<AdminChangePasswordProvider, 'execute'>
  >;

  const mockAdmin: Admin = {
    id: 1,
    email: 'admin@example.com',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(Admin),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: AdminLoginProvider,
          useValue: { execute: jest.fn() },
        },
        {
          provide: AdminChangePasswordProvider,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    adminsRepository = module.get(getRepositoryToken(Admin));
    adminLoginProvider = module.get(AdminLoginProvider);
    adminChangePasswordProvider = module.get(AdminChangePasswordProvider);
  });

  describe('findById', () => {
    it('should return an admin when found', async () => {
      adminsRepository.findOne.mockResolvedValue(mockAdmin);

      const result = await service.findById(1);

      expect(result).toEqual(mockAdmin);
      expect(adminsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw UnauthorizedException when admin not found', async () => {
      adminsRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(
        new UnauthorizedException('Admin not found'),
      );
    });

    it('should throw via handleError when repository throws', async () => {
      adminsRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect(service.findById(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('adminLogin', () => {
    it('should delegate to adminLoginProvider.execute', async () => {
      const dto = { email: 'admin@example.com', password: 'password123' };
      const loginResult = {
        admin: { id: 1, email: 'admin@example.com' },
        tokens: { accessToken: 'access', refreshToken: 'refresh' },
      };
      adminLoginProvider.execute.mockResolvedValue(loginResult);

      const result = await service.adminLogin(dto);

      expect(result).toEqual(loginResult);
      expect(adminLoginProvider.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('changePassword', () => {
    it('should delegate to adminChangePasswordProvider.execute', async () => {
      const dto = {
        currentPassword: 'oldPass',
        newPassword: 'newPass',
      };
      adminChangePasswordProvider.execute.mockResolvedValue(
        'Password has been changed successfully',
      );

      const result = await service.changePassword(mockAdmin, dto);

      expect(result).toBe('Password has been changed successfully');
      expect(adminChangePasswordProvider.execute).toHaveBeenCalledWith(
        mockAdmin,
        dto,
      );
    });
  });
});
