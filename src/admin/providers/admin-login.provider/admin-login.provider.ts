import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../../entities/admin.entity';
import { AdminLoginDto } from '../../dto/admin-login.dto';
import { HashingProvider } from '@/auths/providers/hashing.provider';
import { GenerateTokensProvider } from '@/auths/providers/generate-tokens.provider/generate-tokens.provider';
import { handleError } from '@/common/error-handlers/error.handler';

@Injectable()
export class AdminLoginProvider {
  constructor(
    private readonly hashingProvider: HashingProvider,
    private readonly generateTokensProvider: GenerateTokensProvider,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async execute(adminLoginDto: AdminLoginDto) {
    // Find admin
    let admin: Admin | null = null;
    try {
      admin = await this.adminRepository.findOne({
        where: { email: adminLoginDto.email },
      });
    } catch (err) {
      handleError(err);
    }

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.hashingProvider.comparePassword(
      adminLoginDto.password,
      admin.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate admin tokens
    const { accessToken, refreshToken } =
      await this.generateTokensProvider.generateAdminLoginTokens(admin);

    return {
      admin: {
        id: admin.id,
        email: admin.email,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}
