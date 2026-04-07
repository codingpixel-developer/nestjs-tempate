import { BadRequestException, Injectable } from '@nestjs/common';
import { AdminChangePasswordDto } from '@/admin/dto/admin-change-password.dto';
import { Admin } from '@/admin/entities/admin.entity';
import { Repository } from 'typeorm';
import { HashingProvider } from '@/auths/providers/hashing.provider';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AdminChangePasswordProvider {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly hashingProvider: HashingProvider,
  ) {}

  async execute(admin: Admin, adminChangePasswordDto: AdminChangePasswordDto) {
    const { currentPassword, newPassword } = adminChangePasswordDto;

    // 1. Find the admin (optional, if `admin` is already the full entity)
    const foundAdmin = await this.adminRepository.findOne({
      where: { id: admin.id },
    });

    if (!foundAdmin) {
      throw new BadRequestException('Admin not found');
    }

    // 2. Compare current password
    const isMatch = await this.hashingProvider.comparePassword(
      currentPassword,
      foundAdmin.password,
    );

    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSameNewPassword = await this.hashingProvider.comparePassword(
      newPassword,
      foundAdmin.password,
    );

    if (isSameNewPassword) {
      throw new BadRequestException(
        'Please, enter new password different form old password',
      );
    }

    // 3. Hash new password
    const hashedNewPassword =
      await this.hashingProvider.hashPassword(newPassword);

    // 4. Save updated password
    foundAdmin.password = hashedNewPassword;
    await this.adminRepository.save(foundAdmin);

    return 'Password has been changed successfully';
  }
}
