import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '../../entities/auth.entity';
import { HashingProvider } from '../hashing.provider';
import { ChangePasswordDto } from '../../dtos/change-password.dto';
import { handleError } from '@/common/error-handlers/error.handler';

@Injectable()
export class ChangePasswordProvider {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly hashingProvider: HashingProvider,
  ) {}

  async execute(userId: number, changePasswordDto: ChangePasswordDto) {
    // Find auth record
    let auth: Auth | null = null;
    try {
      auth = await this.authRepository.findOne({
        where: { id: userId },
      });
    } catch (err) {
      handleError(err);
    }

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await this.hashingProvider.comparePassword(
      changePasswordDto.currentPassword,
      auth.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Current password is incorrect! Logging out...',
      );
    }

    const isSamePassword = await this.hashingProvider.comparePassword(
      changePasswordDto.newPassword,
      auth.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'Please, Enter new password different from old password',
      );
    }

    // Hash new password
    const hashedPassword = await this.hashingProvider.hashPassword(
      changePasswordDto.newPassword,
    );

    // Update password
    auth.password = hashedPassword;
    await this.authRepository.save(auth);

    return { message: 'Password changed successfully' };
  }
}
