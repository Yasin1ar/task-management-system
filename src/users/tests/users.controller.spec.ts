import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRole } from '@prisma/client';
import { UserQueryDto } from '../dto/user-query.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateRole: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        password: 'Password123',
        email: 'test@example.com',
      };

      const expectedResult = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const query: UserQueryDto = { page: 1, limit: 10 };
      const expectedResult = {
        data: [
          {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: UserRole.User,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockUsersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const userId = 1;
      const expectedResult = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(userId);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 999;
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found`),
      );

      await expect(controller.findOne(userId)).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const userId = 1;
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'User',
      };
      const expectedResult = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'User',
        role: UserRole.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(userId, updateUserDto);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(userId, updateUserDto);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 999;
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
      };

      mockUsersService.update.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found`),
      );

      await expect(controller.update(userId, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.update).toHaveBeenCalledWith(userId, updateUserDto);
    });
  });

  describe('updateRole', () => {
    it('should update a user role', async () => {
      const userId = 1;
      const role = UserRole.Admin;
      const expectedResult = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.Admin,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.updateRole.mockResolvedValue(expectedResult);

      const result = await controller.updateRole(userId, role);

      expect(result).toEqual(expectedResult);
      expect(service.updateRole).toHaveBeenCalledWith(userId, role);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 999;
      const role = UserRole.Admin;

      mockUsersService.updateRole.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found`),
      );

      await expect(controller.updateRole(userId, role)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.updateRole).toHaveBeenCalledWith(userId, role);
    });

    it('should throw BadRequestException if role is invalid', async () => {
      const userId = 1;
      const role = 'InvalidRole' as UserRole;

      mockUsersService.updateRole.mockRejectedValue(
        new BadRequestException('Invalid role. Must be Admin or User'),
      );

      await expect(controller.updateRole(userId, role)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.updateRole).toHaveBeenCalledWith(userId, role);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      const userId = 1;
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(userId);

      expect(service.remove).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 999;
      mockUsersService.remove.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found`),
      );

      await expect(controller.remove(userId)).rejects.toThrow(NotFoundException);
      expect(service.remove).toHaveBeenCalledWith(userId);
    });
  });
});