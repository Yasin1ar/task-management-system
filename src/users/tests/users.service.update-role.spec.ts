import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('UsersService - updateRole', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateRole', () => {
    it('should update a user role successfully', async () => {
      const userId = 1;
      const newRole = UserRole.Admin;

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        role: UserRole.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = {
        ...existingUser,
        role: newRole,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateRole(userId, newRole);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { role: newRole },
      });

      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.Admin,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      // Password should be excluded from the result
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 999;
      const newRole = UserRole.Admin;

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updateRole(userId, newRole)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found`),
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if role is invalid', async () => {
      const userId = 1;
      const invalidRole = 'InvalidRole' as UserRole;

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        role: UserRole.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.updateRole(userId, invalidRole)).rejects.toThrow(
        new BadRequestException('Invalid role. Must be Admin or User'),
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should not update if the role is the same', async () => {
      const userId = 1;
      const sameRole = UserRole.User;

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        role: UserRole.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue(existingUser);

      const result = await service.updateRole(userId, sameRole);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { role: sameRole },
      });

      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.User,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      // Password should be excluded from the result
      expect(result).not.toHaveProperty('password');
    });
  });
});