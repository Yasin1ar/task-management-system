import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from '../profile.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return a user profile without password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        phoneNumber: null,
        username: 'testuser',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        profilePicture: null,
        role: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('username', 'testuser');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
      await expect(service.getProfile(999)).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      phoneNumber: null,
      username: 'testuser',
      password: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      profilePicture: null,
      role: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updateProfileDto: UpdateProfileDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update a user profile successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        ...updateProfileDto,
      });

      const result = await service.updateProfile(1, updateProfileDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateProfileDto,
      });
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('firstName', 'Updated');
      expect(result).toHaveProperty('lastName', 'Name');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile(999, updateProfileDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateProfile(999, updateProfileDto)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw BadRequestException if email is already in use', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 2,
        email: 'new@example.com',
      });

      const updateWithEmail: UpdateProfileDto = { email: 'new@example.com' };

      await expect(service.updateProfile(1, updateWithEmail)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateProfile(1, updateWithEmail)).rejects.toThrow(
        'Email already in use',
      );
    });

    it('should throw BadRequestException if phone number is already in use', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 2,
        phoneNumber: '+1234567890',
      });

      const updateWithPhone: UpdateProfileDto = { phoneNumber: '+1234567890' };

      await expect(service.updateProfile(1, updateWithPhone)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateProfile(1, updateWithPhone)).rejects.toThrow(
        'Phone number already in use',
      );
    });
  });

  describe('updateProfilePicture', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      phoneNumber: null,
      username: 'testuser',
      password: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      profilePicture: 'old-picture-path',
      role: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      destination: './uploads/profiles',
      filename: 'profile-123.jpg',
      path: 'uploads/profiles/profile-123.jpg',
      size: 12345,
    } as Express.Multer.File;

    it('should update a user profile picture successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        profilePicture: mockFile.path,
      });

      // Mock fs.existsSync and fs.unlinkSync
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
      (path.join as jest.Mock).mockReturnValue('full/path/to/old-picture-path');

      const result = await service.updateProfilePicture(1, mockFile);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { profilePicture: mockFile.path },
      });
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('profilePicture', mockFile.path);
    });

    it('should handle case where old profile picture does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        profilePicture: mockFile.path,
      });

      // Mock fs.existsSync to return false
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (path.join as jest.Mock).mockReturnValue('full/path/to/old-picture-path');

      const result = await service.updateProfilePicture(1, mockFile);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(result).toHaveProperty('profilePicture', mockFile.path);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfilePicture(999, mockFile)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateProfilePicture(999, mockFile)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getProfilePicture', () => {
    const mockUser = {
      id: 1,
      profilePicture: 'uploads/profiles/profile-123.jpg',
    };

    it('should return the profile picture path', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfilePicture(1, 1);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBe(mockUser.profilePicture);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfilePicture(999, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProfilePicture(999, 999)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw NotFoundException if profile picture not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        profilePicture: null,
      });

      await expect(service.getProfilePicture(1, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProfilePicture(1, 1)).rejects.toThrow(
        'Profile picture not found',
      );
    });

    it('should throw UnauthorizedException if requesting user is not the profile owner', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.getProfilePicture(1, 2)).rejects.toThrow(
        'You can only access your own profile picture',
      );
    });
  });
});