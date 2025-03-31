/**
 * Users Service Tests
 * 
 * This test suite validates the functionality of the UsersService:
 * - Creating users
 * - Retrieving users (single or paginated list)
 * - Updating users
 * - Deleting users
 * - Error handling for various scenarios
 */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    
    // Mock bcrypt.hash to return a fixed value
    jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed-password'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.User,
    };

    it('should create a new user successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 1,
        email: createUserDto.email,
        phoneNumber: null,
        username: createUserDto.username,
        password: 'hashed-password',
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        profilePicture: null,
        role: createUserDto.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createUserDto);

      expect(mockPrismaService.user.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('username', createUserDto.username);
      expect(result).toHaveProperty('role', createUserDto.role);
    });

    it('should throw an error if neither email nor phone number is provided', async () => {
      const invalidDto = { ...createUserDto, email: undefined };
      
      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto)).rejects.toThrow('Either email or phone number must be provided');
    });

    it('should throw an error if email is already in use', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        email: createUserDto.email,
        username: 'different-username',
        phoneNumber: null,
      });

      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createUserDto)).rejects.toThrow('Email already in use');
    });

    it('should throw an error if username is already in use', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        email: 'different@example.com',
        username: createUserDto.username,
        phoneNumber: null,
      });

      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createUserDto)).rejects.toThrow('Username already in use');
    });

    it('should throw an error if phone number is already in use', async () => {
      const dtoWithPhone = { ...createUserDto, phoneNumber: '+1234567890' };
      mockPrismaService.user.findFirst.mockResolvedValue({
        email: 'different@example.com',
        username: 'different-username',
        phoneNumber: dtoWithPhone.phoneNumber,
      });

      await expect(service.create(dtoWithPhone)).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoWithPhone)).rejects.toThrow('Phone number already in use');
    });
  });

  describe('findAll', () => {
    const mockUsers = [
      {
        id: 1,
        email: 'user1@example.com',
        username: 'user1',
        firstName: 'User',
        lastName: 'One',
        role: UserRole.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        email: 'user2@example.com',
        username: 'user2',
        firstName: 'User',
        lastName: 'Two',
        role: UserRole.Admin,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return paginated users with metadata', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(10);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(mockPrismaService.user.count).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toEqual(mockUsers);
      expect(result.meta).toEqual({
        total: 10,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply filters correctly', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUsers[0]]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const query = { 
        username: 'user1', 
        email: 'user1', 
        role: UserRole.User,
        page: 1,
        limit: 10
      };
      
      await service.findAll(query);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            username: { contains: 'user1' },
            email: { contains: 'user1' },
            role: UserRole.User,
          },
        })
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(30);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      
      expect(result.meta).toEqual({
        total: 30,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });
  });

  describe('findOne', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      phoneNumber: null,
      username: 'testuser',
      password: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      profilePicture: null,
      role: UserRole.User,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return a user if found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('username', 'testuser');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('User with ID 999 not found');
    });
  });

  describe('update', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      phoneNumber: null,
      username: 'testuser',
      password: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      profilePicture: null,
      role: UserRole.User,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
      role: UserRole.Admin,
    };

    it('should update a user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      });

      const result = await service.update(1, updateUserDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateUserDto,
      });
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('firstName', 'Updated');
      expect(result).toHaveProperty('lastName', 'Name');
      expect(result).toHaveProperty('role', UserRole.Admin);
    });

    it('should hash password if provided in update', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        password: 'new-hashed-password',
      });

      const updateWithPassword: UpdateUserDto = { password: 'NewPassword123' };
      await service.update(1, updateWithPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          password: 'hashed-password', // Mock returns this value
        }),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateUserDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(999, updateUserDto)).rejects.toThrow('User with ID 999 not found');
    });

    it('should throw BadRequestException if email is already in use', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 2,
        email: 'new@example.com',
      });

      const updateWithEmail: UpdateUserDto = { email: 'new@example.com' };

      await expect(service.update(1, updateWithEmail)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateWithEmail)).rejects.toThrow('Email already in use');
    });

    it('should throw BadRequestException if phone number is already in use', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 2,
        phoneNumber: '+1234567890',
      });

      const updateWithPhone: UpdateUserDto = { phoneNumber: '+1234567890' };

      await expect(service.update(1, updateWithPhone)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateWithPhone)).rejects.toThrow('Phone number already in use');
    });
  });

  describe('remove', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
    };

    it('should delete a user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      await service.remove(1);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow('User with ID 999 not found');
    });
  });
});
