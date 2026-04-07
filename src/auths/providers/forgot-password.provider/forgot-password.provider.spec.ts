import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ForgotPasswordProvider } from './forgot-password.provider';
import { Auth } from '../../entities/auth.entity';
import { GenerateTokensProvider } from '../generate-tokens.provider/generate-tokens.provider';
import { MailsService } from '@/mails/providers/mail.service';

describe('ForgotPasswordProvider', () => {
  let provider: ForgotPasswordProvider;
  let authRepository: jest.Mocked<Pick<Repository<Auth>, 'findOne'>>;
  let mailService: jest.Mocked<Pick<MailsService, 'sendResetPasswordEmail'>>;
  let generateTokensProvider: jest.Mocked<
    Pick<GenerateTokensProvider, 'generateResetPasswordToken'>
  >;

  const mockUser = { id: 1, email: 'user@example.com', name: 'Test User' };
  const mockAuth = {
    id: 1,
    email: 'user@example.com',
    password: 'hashedPassword',
    user: mockUser,
  } as Auth;

  const forgotPasswordDto = { email: 'user@example.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForgotPasswordProvider,
        {
          provide: getRepositoryToken(Auth),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: MailsService,
          useValue: { sendResetPasswordEmail: jest.fn() },
        },
        {
          provide: GenerateTokensProvider,
          useValue: { generateResetPasswordToken: jest.fn() },
        },
      ],
    }).compile();

    provider = module.get<ForgotPasswordProvider>(ForgotPasswordProvider);
    authRepository = module.get(getRepositoryToken(Auth));
    mailService = module.get(MailsService);
    generateTokensProvider = module.get(GenerateTokensProvider);
  });

  it('should send reset password email successfully', async () => {
    authRepository.findOne.mockResolvedValue(mockAuth);
    generateTokensProvider.generateResetPasswordToken.mockResolvedValue(
      'reset-token-123',
    );
    mailService.sendResetPasswordEmail.mockResolvedValue(undefined);

    const result = await provider.execute(forgotPasswordDto);

    expect(result).toBe('Reset password instructions sent to your email');
  });

  it('should find auth by email with user relation', async () => {
    authRepository.findOne.mockResolvedValue(mockAuth);
    generateTokensProvider.generateResetPasswordToken.mockResolvedValue(
      'reset-token-123',
    );
    mailService.sendResetPasswordEmail.mockResolvedValue(undefined);

    await provider.execute(forgotPasswordDto);

    expect(authRepository.findOne).toHaveBeenCalledWith({
      where: { email: forgotPasswordDto.email },
      relations: ['user'],
    });
  });

  it('should send email with correct arguments', async () => {
    authRepository.findOne.mockResolvedValue(mockAuth);
    generateTokensProvider.generateResetPasswordToken.mockResolvedValue(
      'reset-token-123',
    );
    mailService.sendResetPasswordEmail.mockResolvedValue(undefined);

    await provider.execute(forgotPasswordDto);

    expect(mailService.sendResetPasswordEmail).toHaveBeenCalledWith(
      mockAuth.user.email,
      mockAuth.user.name,
      'reset-token-123',
    );
  });

  it('should throw NotFoundException when auth not found', async () => {
    authRepository.findOne.mockResolvedValue(null);

    await expect(provider.execute(forgotPasswordDto)).rejects.toThrow(
      new NotFoundException('User not found'),
    );
  });

  it('should throw NotFoundException when reset token generation returns null', async () => {
    authRepository.findOne.mockResolvedValue(mockAuth);
    generateTokensProvider.generateResetPasswordToken.mockResolvedValue(
      undefined,
    );

    await expect(provider.execute(forgotPasswordDto)).rejects.toThrow(
      new NotFoundException('Reset token not found'),
    );
  });

  it('should handle repository error gracefully', async () => {
    authRepository.findOne.mockRejectedValue(new Error('DB error'));

    await expect(provider.execute(forgotPasswordDto)).rejects.toThrow();
  });
});
