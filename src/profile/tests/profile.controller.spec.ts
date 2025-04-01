import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from '../profile.controller';
import { ProfileService } from '../profile.service';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interfaces';

describe('ProfileController', () => {
  let controller: ProfileController;
  let service: ProfileService;

  const mockProfileService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    updateProfilePicture: jest.fn(),
    getProfilePicture: jest.fn(),
  };

  const mockResponse = {
    sendFile: jest.fn(),
  } as unknown as Response;

  // Create a mock AuthenticatedUser that matches the interface
  const createMockUser = (id: number, username: string, role: UserRole): AuthenticatedUser => ({
    id,
    username,
    role,
    email: `${username}@example.com`,
    phoneNumber: null,
    firstName: 'Test',
    lastName: 'User',
    profilePicture: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return the user profile', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProfileService.getProfile.mockResolvedValue(mockUser);

      const result = await controller.getProfile(createMockUser(1, 'testuser', UserRole.User));

      expect(result).toEqual(mockUser);
      expect(service.getProfile).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockProfileService.getProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.getProfile(createMockUser(999, 'nonexistent', UserRole.User)),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto: UpdateProfileDto = {
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated@example.com',
    };

    it('should update the user profile', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        role: UserRole.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProfileService.updateProfile.mockResolvedValue(mockUser);

      const result = await controller.updateProfile(
        createMockUser(1, 'testuser', UserRole.User),
        updateProfileDto,
      );

      expect(result).toEqual(mockUser);
      expect(service.updateProfile).toHaveBeenCalledWith(1, updateProfileDto);
    });

    it('should throw BadRequestException if email is already in use', async () => {
      mockProfileService.updateProfile.mockRejectedValue(
        new BadRequestException('Email already in use'),
      );

      await expect(
        controller.updateProfile(
          createMockUser(1, 'testuser', UserRole.User),
          updateProfileDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockProfileService.updateProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.updateProfile(
          createMockUser(999, 'nonexistent', UserRole.User),
          updateProfileDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfilePicture', () => {
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

    it('should update the user profile picture', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        profilePicture: 'uploads/profiles/profile-123.jpg',
        role: UserRole.User,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProfileService.updateProfilePicture.mockResolvedValue(mockUser);

      const result = await controller.updateProfilePicture(
        createMockUser(1, 'testuser', UserRole.User),
        mockFile,
      );

      expect(result).toEqual(mockUser);
      expect(service.updateProfilePicture).toHaveBeenCalledWith(1, mockFile);
    });

    it('should throw BadRequestException if file is not provided', () => {
      // Use a synchronous expect for a synchronous exception
      expect(() => {
        controller.updateProfilePicture(
          createMockUser(1, 'testuser', UserRole.User),
          undefined as unknown as Express.Multer.File,
        );
      }).toThrow(BadRequestException);
      
      // Verify the service method wasn't called
      expect(service.updateProfilePicture).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockProfileService.updateProfilePicture.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.updateProfilePicture(
          createMockUser(999, 'nonexistent', UserRole.User),
          mockFile,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfilePicture', () => {
    it('should return the profile picture', async () => {
      const picturePath = 'uploads/profiles/profile-123.jpg';
      mockProfileService.getProfilePicture.mockResolvedValue(picturePath);

      await controller.getProfilePicture(
        1,
        createMockUser(1, 'testuser', UserRole.User),
        mockResponse,
      );

      expect(service.getProfilePicture).toHaveBeenCalledWith(1, 1);
      expect(mockResponse.sendFile).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user tries to access another user\'s picture', async () => {
      mockProfileService.getProfilePicture.mockRejectedValue(
        new UnauthorizedException('You can only access your own profile picture'),
      );

      await expect(
        controller.getProfilePicture(
          2,
          createMockUser(1, 'testuser', UserRole.User),
          mockResponse,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockResponse.sendFile).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if profile picture not found', async () => {
      mockProfileService.getProfilePicture.mockRejectedValue(
        new NotFoundException('Profile picture not found'),
      );

      await expect(
        controller.getProfilePicture(
          1,
          createMockUser(1, 'testuser', UserRole.User),
          mockResponse,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockResponse.sendFile).not.toHaveBeenCalled();
    });
  });
});
