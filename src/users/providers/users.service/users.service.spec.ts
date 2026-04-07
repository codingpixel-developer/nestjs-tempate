import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { SignupUserProvider } from '../signup-user.provider/signup-user.provider';
import { UpdateUserProvider } from '../update-user.provider/update-user.provider';
import { User } from '../../entities/user.entity';
import { UserType } from '../../enums/user-type.enum';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let signupUserProvider: jest.Mocked<Pick<SignupUserProvider, 'execute'>>;
  let updateUserProvider: jest.Mocked<Pick<UpdateUserProvider, 'execute'>>;

  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    type: UserType.USER,
    auth: null as unknown as User['auth'],
    created_at: new Date(),
    updated_at: new Date(),
  } satisfies User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: SignupUserProvider,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateUserProvider,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    signupUserProvider = module.get(SignupUserProvider);
    updateUserProvider = module.get(UpdateUserProvider);
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: [],
      });
    });

    it('should pass relations and where conditions', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      await service.findById(1, ['auth'], { email: 'john@example.com' });

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, email: 'john@example.com' },
        relations: ['auth'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when user not found and throwUnauthorized=true', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(1, [], {}, true)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw NotFoundException when id is 0 (falsy)', async () => {
      await expect(service.findById(0)).rejects.toThrow(NotFoundException);
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when id is 0 and throwUnauthorized=true', async () => {
      await expect(service.findById(0, [], {}, true)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when id is null', async () => {
      await expect(service.findById(null as unknown as number)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when id is undefined', async () => {
      await expect(
        service.findById(undefined as unknown as number),
      ).rejects.toThrow(NotFoundException);
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('signupUser', () => {
    it('should delegate to signupUserProvider.execute', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };
      signupUserProvider.execute.mockResolvedValue('User created successfully');

      const result = await service.signupUser(dto);

      expect(result).toBe('User created successfully');
      expect(signupUserProvider.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateCurrentUser', () => {
    it('should delegate to updateUserProvider.execute', async () => {
      const dto = { name: 'Jane Doe' };
      const activeUser = {
        id: 1,
        email: 'john@example.com',
        type: UserType.USER,
      };
      updateUserProvider.execute.mockResolvedValue('User updated successfully');

      const result = await service.updateCurrentUser(dto, activeUser);

      expect(result).toBe('User updated successfully');
      expect(updateUserProvider.execute).toHaveBeenCalledWith(dto, activeUser);
    });
  });
});
