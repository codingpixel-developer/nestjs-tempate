import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdminChangePasswordProvider } from './admin-change-password.provider';
import { Admin } from '../../entities/admin.entity';
import { HashingProvider } from '@/auths/providers/hashing.provider';

describe('AdminChangePasswordProvider', () => {
  let provider: AdminChangePasswordProvider;
  let adminRepository: jest.Mocked<Pick<Repository<Admin>, 'findOne' | 'save'>>;
  let hashingProvider: jest.Mocked<
    Pick<HashingProvider, 'comparePassword' | 'hashPassword'>
  >;

  const mockAdmin: Admin = {
    id: 1,
    email: 'admin@example.com',
    password: 'hashedOldPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const changePasswordDto = {
    currentPassword: 'oldPassword',
    newPassword: 'newPassword',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminChangePasswordProvider,
        {
          provide: getRepositoryToken(Admin),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: HashingProvider,
          useValue: {
            hashPassword: jest.fn(),
            comparePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    provider = module.get<AdminChangePasswordProvider>(
      AdminChangePasswordProvider,
    );
    adminRepository = module.get(getRepositoryToken(Admin));
    hashingProvider = module.get(HashingProvider);
  });

  it('should change password successfully', async () => {
    const foundAdmin = { ...mockAdmin };
    adminRepository.findOne.mockResolvedValue(foundAdmin);
    hashingProvider.comparePassword
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    hashingProvider.hashPassword.mockResolvedValue('hashedNewPassword');
    adminRepository.save.mockResolvedValue({
      ...foundAdmin,
      password: 'hashedNewPassword',
    });

    const result = await provider.execute(mockAdmin, changePasswordDto);

    expect(result).toBe('Password has been changed successfully');
  });

  it('should look up admin by admin.id', async () => {
    const foundAdmin = { ...mockAdmin };
    adminRepository.findOne.mockResolvedValue(foundAdmin);
    hashingProvider.comparePassword
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    hashingProvider.hashPassword.mockResolvedValue('hashedNewPassword');
    adminRepository.save.mockResolvedValue(foundAdmin);

    await provider.execute(mockAdmin, changePasswordDto);

    expect(adminRepository.findOne).toHaveBeenCalledWith({
      where: { id: mockAdmin.id },
    });
  });

  it('should save with hashed new password', async () => {
    const foundAdmin = { ...mockAdmin };
    adminRepository.findOne.mockResolvedValue(foundAdmin);
    hashingProvider.comparePassword
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    hashingProvider.hashPassword.mockResolvedValue('hashedNewPassword');
    adminRepository.save.mockResolvedValue({
      ...foundAdmin,
      password: 'hashedNewPassword',
    });

    await provider.execute(mockAdmin, changePasswordDto);

    expect(hashingProvider.hashPassword).toHaveBeenCalledWith(
      changePasswordDto.newPassword,
    );
    expect(adminRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashedNewPassword' }),
    );
  });

  it('should throw BadRequestException when admin not found', async () => {
    adminRepository.findOne.mockResolvedValue(null);

    await expect(
      provider.execute(mockAdmin, changePasswordDto),
    ).rejects.toThrow(new BadRequestException('Admin not found'));
  });

  it('should throw BadRequestException when current password is wrong', async () => {
    adminRepository.findOne.mockResolvedValue({ ...mockAdmin });
    hashingProvider.comparePassword.mockResolvedValue(false);

    await expect(
      provider.execute(mockAdmin, changePasswordDto),
    ).rejects.toThrow(new BadRequestException('Current password is incorrect'));
  });

  it('should throw BadRequestException when new password is same as old', async () => {
    adminRepository.findOne.mockResolvedValue({ ...mockAdmin });
    hashingProvider.comparePassword
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(
      provider.execute(mockAdmin, changePasswordDto),
    ).rejects.toThrow(
      new BadRequestException(
        'Please, enter new password different form old password',
      ),
    );
  });
});
