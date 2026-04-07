import { handleError } from '@/common/error-handlers/error.handler';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForgotPasswordDto } from '../../dtos/forgot-password.dto';
import { Auth } from '../../entities/auth.entity';
import { GenerateTokensProvider } from '../generate-tokens.provider/generate-tokens.provider';
import { MailsService } from '@/mails/providers/mail.service';

@Injectable()
export class ForgotPasswordProvider {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly mailService: MailsService,
    private readonly generateTokensProvider: GenerateTokensProvider,
  ) {}

  async execute(forgotPasswordDto: ForgotPasswordDto) {
    let auth: Auth | null = null;
    try {
      auth = await this.authRepository.findOne({
        where: { email: forgotPasswordDto.email },
        relations: ['user'],
      });
    } catch (err) {
      handleError(err);
    }

    if (!auth) {
      throw new NotFoundException('User not found');
    }

    // Generate reset token
    const resetToken =
      await this.generateTokensProvider.generateResetPasswordToken(auth);

    if (!resetToken) {
      throw new NotFoundException('Reset token not found');
    }

    // Send email
    await this.mailService.sendResetPasswordEmail(
      auth.user.email,
      auth.user.name,
      resetToken,
    );

    return 'Reset password instructions sent to your email';
  }
}
