import { AdminChangePasswordDto } from '@/admin/dto/admin-change-password.dto';
import { Admin } from '@/admin/entities/admin.entity';
import { AdminChangePasswordProvider } from '@/admin/providers/admin-change-password.provider/admin-change-password.provider';
import { handleError } from '@/common/error-handlers/error.handler';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminLoginDto } from '../../dto/admin-login.dto';
import { AdminLoginProvider } from '../admin-login.provider/admin-login.provider';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminsRepository: Repository<Admin>,

    private readonly adminLoginProvider: AdminLoginProvider,

    private readonly adminChangePasswordProvider: AdminChangePasswordProvider,
  ) {}

  async findById(id: number) {
    let admin: Admin | null = null;
    try {
      admin = await this.adminsRepository.findOne({ where: { id } });
    } catch (err) {
      handleError(err);
    }

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    return admin;
  }

  async adminLogin(adminLoginDto: AdminLoginDto) {
    return this.adminLoginProvider.execute(adminLoginDto);
  }

  async changePassword(
    user: Admin,
    adminChangePasswordDto: AdminChangePasswordDto,
  ) {
    return this.adminChangePasswordProvider.execute(
      user,
      adminChangePasswordDto,
    );
  }
}
