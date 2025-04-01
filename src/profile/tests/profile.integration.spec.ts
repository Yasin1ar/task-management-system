import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ProfileService } from '../profile.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

describe('ProfileService Integration Tests', () => {
  let app: INestApplication;
  let profileService: ProfileService;
  let prismaService: PrismaService;
  let userId: number;
  let testImagePath: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [ProfileService, PrismaService],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    profileService = moduleFixture.get<ProfileService>(ProfileService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Create a test user
    const hashedPassword = await bcrypt.hash('Password123', 10);
    const user = await prismaService.user.create({
      data: {
        username: 'integrationuser',
        email: 'integration@example.com',
        password: hashedPassword,
        firstName: 'Integration',
        lastName: 'Test',
        role: UserRole.User,
      },
    });
    userId = user.id;

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create a test image file
    testImagePath = path.join(uploadsDir, 'test-integration-image.jpg');
    fs.writeFileSync(testImagePath, 'test image content');
  });

  afterAll(async () => {
    // Clean up test user
    await prismaService.user.delete({
      where: { id: userId },
    });

    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }

    await app.close();
  });

  describe('getProfile', () => {
    it('should return the user profile', async () => {
      const profile = await profileService.getProfile(userId);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(userId);
      expect(profile.username).toBe('integrationuser');
      expect(profile.email).toBe('integration@example.com');
      expect(profile.firstName).toBe('Integration');
      expect(profile.lastName).toBe('Test');
      expect(profile).not.toHaveProperty('password');
    });
  });

  describe('updateProfile', () => {
    it('should update the user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Profile',
      };

      const updatedProfile = await profileService.updateProfile(userId, updateData);

      expect(updatedProfile).toBeDefined();
      expect(updatedProfile.id).toBe(userId);
      expect(updatedProfile.firstName).toBe('Updated');
      expect(updatedProfile.lastName).toBe('Profile');
      expect(updatedProfile.username).toBe('integrationuser');
      expect(updatedProfile).not.toHaveProperty('password');
    });
  });

  describe('updateProfilePicture', () => {
    it('should update the user profile picture', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        destination: './uploads/profiles',
        filename: 'profile-integration-test.jpg',
        path: testImagePath,
        size: 12345,
      } as Express.Multer.File;

      const updatedProfile = await profileService.updateProfilePicture(userId, mockFile);

      expect(updatedProfile).toBeDefined();
      expect(updatedProfile.id).toBe(userId);
      expect(updatedProfile.profilePicture).toBe(testImagePath);
      expect(updatedProfile).not.toHaveProperty('password');
    });
  });
});