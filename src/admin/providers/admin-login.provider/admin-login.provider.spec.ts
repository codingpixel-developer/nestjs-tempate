import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdminLoginProvider } from './admin-login.provider';
import { Admin } from '../../entities/admin.entity';
import { HashingProvider } from '@/auths/providers/hashing.provider';
import { GenerateTokensProvider } from '@/auths/providers/generate-tokens.provider/generate-tokens.provider';

describe('AdminLoginProvider', () => {
  let provider: AdminLoginProvider;
  let adminRepository: jest.Mocked<Pick<Repository<Admin>, 'findOne'>>;
  let hashingProvider: jest.Mocked<
    Pick<HashingProvider, 'comparePassword' | 'hashPassword'>
  >;
  let generateTokensProvider: jest.Mocked<
    Pick<GenerateTokensProvider, 'generateAdminLoginTokens'>
  >;

  const mockAdmin: Admin = {
    id: 1,
    email: 'admin@example.com',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const loginDto = {
    email: 'admin@example.com',
    password: 'password123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminLoginProvider,
        {
          provide: getRepositoryToken(Admin),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: HashingProvider,
          useValue: {
            hashPassword: jest.fn(),
            comparePassword: jest.fn(),
          },
        },
        {
          provide: GenerateTokensProvider,
          useValue: { generateAdminLoginTokens: jest.fn() },
        },
      ],
    }).compile();

    provider = module.get<AdminLoginProvider>(AdminLoginProvider);
    adminRepository = module.get(getRepositoryToken(Admin));
    hashingProvider = module.get(HashingProvider);
    generateTokensProvider = module.get(GenerateTokensProvider);
  });

  it('should return admin and tokens on successful login', async () => {
    adminRepository.findOne.mockResolvedValue(mockAdmin);
    hashingProvider.comparePassword.mockResolvedValue(true);
    generateTokensProvider.generateAdminLoginTokens.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const result = await provider.execute(loginDto);

    expect(result).toEqual({
      admin: { id: 1, email: 'admin@example.com' },
      tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
    });
  });

  it('should search admin by email', async () => {
    adminRepository.findOne.mockResolvedValue(mockAdmin);
    hashingProvider.comparePassword.mockResolvedValue(true);
    generateTokensProvider.generateAdminLoginTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    });

    await provider.execute(loginDto);

    expect(adminRepository.findOne).toHaveBeenCalledWith({
      where: { email: loginDto.email },
    });
  });

  it('should compare dto password with stored hash', async () => {
    adminRepository.findOne.mockResolvedValue(mockAdmin);
    hashingProvider.comparePassword.mockResolvedValue(true);
    generateTokensProvider.generateAdminLoginTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    });

    await provider.execute(loginDto);

    expect(hashingProvider.comparePassword).toHaveBeenCalledWith(
      loginDto.password,
      mockAdmin.password,
    );
  });

  it('should throw UnauthorizedException when admin not found', async () => {
    adminRepository.findOne.mockResolvedValue(null);

    await expect(provider.execute(loginDto)).rejects.toThrow(
      new UnauthorizedException('Invalid credentials'),
    );
  });

  it('should throw UnauthorizedException when password is invalid', async () => {
    adminRepository.findOne.mockResolvedValue(mockAdmin);
    hashingProvider.comparePassword.mockResolvedValue(false);

    await expect(provider.execute(loginDto)).rejects.toThrow(
      new UnauthorizedException('Invalid credentials'),
    );
  });

  it('should throw via handleError when repository throws', async () => {
    adminRepository.findOne.mockRejectedValue(new Error('DB error'));

    await expect(provider.execute(loginDto)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
