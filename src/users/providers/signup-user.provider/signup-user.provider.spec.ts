import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, RequestTimeoutException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SignupUserProvider } from './signup-user.provider';
import { AuthsService } from '@/auths/providers/auths.service/auths.service';
import { User } from '../../entities/user.entity';
import { UserType } from '../../enums/user-type.enum';
import { SignupUserDto } from '../../dtos/signup-user.dto';
import { Auth } from '@/auths/entities/auth.entity';

interface MockQueryRunner {
  connect: jest.Mock;
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
  manager: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
}

describe('SignupUserProvider', () => {
  let provider: SignupUserProvider;
  let authsService: jest.Mocked<Pick<AuthsService, 'createAuth'>>;
  let mockQueryRunner: MockQueryRunner;
  let dataSource: { createQueryRunner: jest.Mock };

  const signupDto: SignupUserDto = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
  };

  const createdUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    type: UserType.USER,
    auth: null as unknown as User['auth'],
    created_at: new Date(),
    updated_at: new Date(),
  } satisfies User;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignupUserProvider,
        { provide: DataSource, useValue: dataSource },
        { provide: AuthsService, useValue: { createAuth: jest.fn() } },
      ],
    }).compile();

    provider = module.get<SignupUserProvider>(SignupUserProvider);
    authsService = module.get(AuthsService);
  });

  it('should create a user successfully', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue(null);
    mockQueryRunner.manager.create.mockReturnValue(createdUser);
    mockQueryRunner.manager.save.mockResolvedValue(createdUser);
    authsService.createAuth.mockResolvedValue({} as unknown as Auth);

    const result = await provider.execute(signupDto);

    expect(result).toBe('User created successfully');
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should create user with UserType.USER', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue(null);
    mockQueryRunner.manager.create.mockReturnValue(createdUser);
    mockQueryRunner.manager.save.mockResolvedValue(createdUser);
    authsService.createAuth.mockResolvedValue({} as unknown as Auth);

    await provider.execute(signupDto);

    expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(User, {
      name: signupDto.name,
      email: signupDto.email,
      type: UserType.USER,
    });
  });

  it('should pass correct args to authService.createAuth', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue(null);
    mockQueryRunner.manager.create.mockReturnValue(createdUser);
    mockQueryRunner.manager.save.mockResolvedValue(createdUser);
    authsService.createAuth.mockResolvedValue({} as unknown as Auth);

    await provider.execute(signupDto);

    expect(authsService.createAuth).toHaveBeenCalledWith(
      {
        email: signupDto.email,
        password: signupDto.password,
        user: createdUser,
      },
      mockQueryRunner,
    );
  });

  it('should throw BadRequestException if user already exists', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue(createdUser);

    await expect(provider.execute(signupDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should throw RequestTimeoutException when DB connection fails', async () => {
    mockQueryRunner.connect.mockRejectedValue(new Error('connection failed'));

    await expect(provider.execute(signupDto)).rejects.toThrow(
      RequestTimeoutException,
    );
  });

  it('should throw RequestTimeoutException when user save fails', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue(null);
    mockQueryRunner.manager.create.mockReturnValue(createdUser);
    mockQueryRunner.manager.save.mockRejectedValue(new Error('save failed'));

    await expect(provider.execute(signupDto)).rejects.toThrow(
      RequestTimeoutException,
    );
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should rollback and rethrow when auth creation fails', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue(null);
    mockQueryRunner.manager.create.mockReturnValue(createdUser);
    mockQueryRunner.manager.save.mockResolvedValue(createdUser);
    const authError = new BadRequestException('Auth failed');
    authsService.createAuth.mockRejectedValue(authError);

    await expect(provider.execute(signupDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should always release queryRunner even on error', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue(null);
    mockQueryRunner.manager.create.mockReturnValue(createdUser);
    mockQueryRunner.manager.save.mockRejectedValue(new Error('fail'));

    await expect(provider.execute(signupDto)).rejects.toThrow();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });
});
