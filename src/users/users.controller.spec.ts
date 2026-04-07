import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './providers/users.service/users.service';
import { UserType } from './enums/user-type.enum';
import { User } from './entities/user.entity';
import type { ActiveUserData } from '@/common/interfaces/active-user-data.interface';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<
    Pick<UsersService, 'signupUser' | 'updateCurrentUser' | 'findById'>
  >;

  beforeEach(async () => {
    usersService = {
      signupUser: jest.fn(),
      updateCurrentUser: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('createUser', () => {
    it('should call usersService.signupUser with dto', async () => {
      const dto = {
        name: 'John',
        email: 'john@example.com',
        password: 'pass123',
      };
      usersService.signupUser.mockResolvedValue('User created successfully');

      const result = await controller.createUser(dto);

      expect(result).toBe('User created successfully');
      expect(usersService.signupUser).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateUser', () => {
    it('should call usersService.updateCurrentUser with dto and activeUser', async () => {
      const dto = { name: 'Jane' };
      const activeUser: ActiveUserData = {
        id: 1,
        email: 'john@example.com',
        type: UserType.USER,
      };
      usersService.updateCurrentUser.mockResolvedValue(
        'User updated successfully',
      );

      const result = await controller.updateUser(dto, activeUser);

      expect(result).toBe('User updated successfully');
      expect(usersService.updateCurrentUser).toHaveBeenCalledWith(
        dto,
        activeUser,
      );
    });
  });

  describe('getUserById', () => {
    it('should call usersService.findById with activeUser.id', async () => {
      const activeUser: ActiveUserData = {
        id: 1,
        email: 'john@example.com',
        type: UserType.USER,
      };
      const mockUser = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        type: UserType.USER,
        auth: null as unknown as User['auth'],
        created_at: new Date(),
        updated_at: new Date(),
      } satisfies User;
      usersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getUserById(activeUser);

      expect(result).toEqual(mockUser);
      expect(usersService.findById).toHaveBeenCalledWith(1, []);
    });
  });
});
