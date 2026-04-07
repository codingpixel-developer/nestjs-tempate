import { Test, TestingModule } from '@nestjs/testing';
import { RequestTimeoutException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UpdateUserProvider } from './update-user.provider';
import { User } from '../../entities/user.entity';
import { UserType } from '../../enums/user-type.enum';
import { ActiveUserData } from '@/common/interfaces/active-user-data.interface';

interface MockQueryRunner {
  connect: jest.Mock;
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
  manager: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
}

describe('UpdateUserProvider', () => {
  let provider: UpdateUserProvider;
  let mockQueryRunner: MockQueryRunner;
  let dataSource: { createQueryRunner: jest.Mock };

  const activeUser: ActiveUserData = {
    id: 1,
    email: 'john@example.com',
    type: UserType.USER,
  };

  const existingUser = {
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
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserProvider,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    provider = module.get<UpdateUserProvider>(UpdateUserProvider);
  });

  it('should update user name successfully', async () => {
    const user = { ...existingUser };
    mockQueryRunner.manager.findOne.mockResolvedValue(user);
    mockQueryRunner.manager.save.mockResolvedValue({ ...user, name: 'Jane' });

    const result = await provider.execute({ name: 'Jane' }, activeUser);

    expect(result).toBe('User updated successfully');
    expect(user.name).toBe('Jane');
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should keep existing name when name is undefined', async () => {
    const user = { ...existingUser };
    mockQueryRunner.manager.findOne.mockResolvedValue(user);
    mockQueryRunner.manager.save.mockResolvedValue(user);

    await provider.execute(
      { name: undefined as unknown as string },
      activeUser,
    );

    expect(user.name).toBe('John Doe');
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should look up user by activeUser.id', async () => {
    const user = { ...existingUser };
    mockQueryRunner.manager.findOne.mockResolvedValue(user);
    mockQueryRunner.manager.save.mockResolvedValue(user);

    await provider.execute({ name: 'Jane' }, activeUser);

    expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(User, {
      where: { id: activeUser.id },
    });
  });

  it('should throw UnauthorizedException when user not found', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue(null);

    await expect(
      provider.execute({ name: 'Jane' }, activeUser),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should throw RequestTimeoutException when DB connection fails', async () => {
    mockQueryRunner.connect.mockRejectedValue(new Error('connection failed'));

    await expect(
      provider.execute({ name: 'Jane' }, activeUser),
    ).rejects.toThrow(RequestTimeoutException);
  });

  it('should rollback when save fails', async () => {
    const user = { ...existingUser };
    mockQueryRunner.manager.findOne.mockResolvedValue(user);
    mockQueryRunner.manager.save.mockRejectedValue(new Error('save failed'));

    await expect(
      provider.execute({ name: 'Jane' }, activeUser),
    ).rejects.toThrow();
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should always release queryRunner even on error', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue(null);

    await expect(
      provider.execute({ name: 'Jane' }, activeUser),
    ).rejects.toThrow();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });
});
