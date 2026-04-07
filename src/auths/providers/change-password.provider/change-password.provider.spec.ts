import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ChangePasswordProvider } from './change-password.provider';
import { Auth } from '../../entities/auth.entity';
import { HashingProvider } from '../hashing.provider';

describe('ChangePasswordProvider', () => {
  let provider: ChangePasswordProvider;
  let authRepository: jest.Mocked<Pick<Repository<Auth>, 'findOne' | 'save'>>;
  let hashingProvider: jest.Mocked<
    Pick<HashingProvider, 'comparePassword' | 'hashPassword'>
  >;

  const mockAuth = {
    id: 1,
    email: 'user@example.com',
    password: 'hashedOldPassword',
  } as Auth;

  const changePasswordDto = {
    currentPassword: 'oldPassword',
    newPassword: 'newPassword1!',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangePasswordProvider,
        {
          provide: getRepositoryToken(Auth),
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

    provider = module.get<ChangePasswordProvider>(ChangePasswordProvider);
    authRepository = module.get(getRepositoryToken(Auth));
    hashingProvider = module.get(HashingProvider);
  });

  it('should change password successfully', async () => {
    const foundAuth = { ...mockAuth };
    authRepository.findOne.mockResolvedValue(foundAuth);
    hashingProvider.comparePassword
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    hashingProvider.hashPassword.mockResolvedValue('hashedNewPassword');
    authRepository.save.mockResolvedValue({
      ...foundAuth,
      password: 'hashedNewPassword',
    });

    const result = await provider.execute(mockAuth.id, changePasswordDto);

    expect(result).toEqual({ message: 'Password changed successfully' });
  });

  it('should find auth by userId', async () => {
    authRepository.findOne.mockResolvedValue({ ...mockAuth });
    hashingProvider.comparePassword
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    hashingProvider.hashPassword.mockResolvedValue('hashedNewPassword');
    authRepository.save.mockResolvedValue({ ...mockAuth });

    await provider.execute(mockAuth.id, changePasswordDto);

    expect(authRepository.findOne).toHaveBeenCalledWith({
      where: { id: mockAuth.id },
    });
  });

  it('should save with hashed new password', async () => {
    const foundAuth = { ...mockAuth };
    authRepository.findOne.mockResolvedValue(foundAuth);
    hashingProvider.comparePassword
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    hashingProvider.hashPassword.mockResolvedValue('hashedNewPassword');
    authRepository.save.mockResolvedValue({
      ...foundAuth,
      password: 'hashedNewPassword',
    });

    await provider.execute(mockAuth.id, changePasswordDto);

    expect(hashingProvider.hashPassword).toHaveBeenCalledWith(
      changePasswordDto.newPassword,
    );
    expect(authRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashedNewPassword' }),
    );
  });

  it('should throw UnauthorizedException when auth not found', async () => {
    authRepository.findOne.mockResolvedValue(null);

    await expect(
      provider.execute(mockAuth.id, changePasswordDto),
    ).rejects.toThrow(new UnauthorizedException('User not found'));
  });

  it('should throw UnauthorizedException when current password is wrong', async () => {
    authRepository.findOne.mockResolvedValue({ ...mockAuth });
    hashingProvider.comparePassword.mockResolvedValue(false);

    await expect(
      provider.execute(mockAuth.id, changePasswordDto),
    ).rejects.toThrow(
      new UnauthorizedException(
        'Current password is incorrect! Logging out...',
      ),
    );
  });

  it('should throw BadRequestException when new password is same as old', async () => {
    authRepository.findOne.mockResolvedValue({ ...mockAuth });
    hashingProvider.comparePassword
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(
      provider.execute(mockAuth.id, changePasswordDto),
    ).rejects.toThrow(
      new BadRequestException(
        'Please, Enter new password different from old password',
      ),
    );
  });

  it('should handle repository error gracefully', async () => {
    authRepository.findOne.mockRejectedValue(new Error('DB error'));

    await expect(
      provider.execute(mockAuth.id, changePasswordDto),
    ).rejects.toThrow();
  });
});
