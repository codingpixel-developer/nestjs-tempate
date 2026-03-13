import { handleError } from '@/common/error-handlers/error.handler';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginDto } from '../dtos/login.dto';
import { Auth } from '../entities/auth.entity';
import { GenerateTokensProvider } from './generate-tokens.provider';
import { HashingProvider } from './hashing.provider';

@Injectable()
export class LoginProvider {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly hashingProvider: HashingProvider,
    private readonly generateTokensProvider: GenerateTokensProvider,
  ) {}

  async execute(loginDto: LoginDto) {
    let auth: Auth | null = null;
    try {
      auth = await this.authRepository.findOne({
        where: { email: loginDto.email },
        relations: ['user'],
      });
    } catch (err) {
      handleError(err);
    }

    if (!auth) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.hashingProvider.comparePassword(
      loginDto.password,
      auth.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.generateTokensProvider.generateLoginTokens(auth.user);

    return {
      user: auth.user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}
