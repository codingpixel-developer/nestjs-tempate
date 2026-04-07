import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { LoginProvider } from './login.provider';
import { Auth } from '../../entities/auth.entity';
import { HashingProvider } from '../hashing.provider';
import { GenerateTokensProvider } from '../generate-tokens.provider/generate-tokens.provider';
import { UserType } from '@/users/enums/user-type.enum';
import { User } from '@/users/entities/user.entity';

describe('LoginProvider', () => {
  let provider: LoginProvider;
  let authRepository: jest.Mocked<Pick<Repository<Auth>, 'findOne'>>;
  let hashingProvider: jest.Mocked<
    Pick<HashingProvider, 'comparePassword' | 'hashPassword'>
  >;
  let generateTokensProvider: jest.Mocked<
    Pick<GenerateTokensProvider, 'generateLoginTokens'>
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

  const loginDto = {
    email: 'test@example.com',
    password: 'password123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginProvider,
        {
          provide: getRepositoryToken(Auth),
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
          useValue: { generateLoginTokens: jest.fn() },
        },
      ],
    }).compile();

    provider = module.get<LoginProvider>(LoginProvider);
    authRepository = module.get(getRepositoryToken(Auth));
    hashingProvider = module.get(HashingProvider);
    generateTokensProvider = module.get(GenerateTokensProvider);
  });

  it('should return user and tokens on successful login', async () => {
    authRepository.findOne.mockResolvedValue(mockAuth);
    hashingProvider.comparePassword.mockResolvedValue(true);
    generateTokensProvider.generateLoginTokens.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const result = await provider.execute(loginDto);

    expect(result).toEqual({
      user: mockUser,
      tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
    });
  });

  it('should find auth by email with user relation', async () => {
    authRepository.findOne.mockResolvedValue(mockAuth);
    hashingProvider.comparePassword.mockResolvedValue(true);
    generateTokensProvider.generateLoginTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    });

    await provider.execute(loginDto);

    expect(authRepository.findOne).toHaveBeenCalledWith({
      where: { email: loginDto.email },
      relations: ['user'],
    });
  });

  it('should compare dto password with stored hash', async () => {
    authRepository.findOne.mockResolvedValue(mockAuth);
    hashingProvider.comparePassword.mockResolvedValue(true);
    generateTokensProvider.generateLoginTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    });

    await provider.execute(loginDto);

    expect(hashingProvider.comparePassword).toHaveBeenCalledWith(
      loginDto.password,
      mockAuth.password,
    );
  });

  it('should throw UnauthorizedException when auth not found', async () => {
    authRepository.findOne.mockResolvedValue(null);

    await expect(provider.execute(loginDto)).rejects.toThrow(
      new UnauthorizedException('Invalid credentials'),
    );
  });

  it('should throw UnauthorizedException when password is invalid', async () => {
    authRepository.findOne.mockResolvedValue(mockAuth);
    hashingProvider.comparePassword.mockResolvedValue(false);

    await expect(provider.execute(loginDto)).rejects.toThrow(
      new UnauthorizedException('Invalid credentials'),
    );
  });

  it('should throw via handleError when repository throws', async () => {
    authRepository.findOne.mockRejectedValue(new Error('DB error'));

    await expect(provider.execute(loginDto)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
