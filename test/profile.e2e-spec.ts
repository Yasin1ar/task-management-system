import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { UserRole } from '@prisma/client';

describe('Profile Module (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let userToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Create a test user
    const hashedPassword = await bcrypt.hash('Password123', 10);
    const user = await prismaService.user.create({
      data: {
        username: 'profileuser',
        email: 'profile@example.com',
        password: hashedPassword,
        firstName: 'Profile',
        lastName: 'User',
        role: UserRole.User,
      },
    });
    userId = user.id;

    // Generate a token for the test user
    userToken = jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up test user
    await prismaService.user.delete({
      where: { id: userId },
    });

    await app.close();
  });

  describe('GET /profile', () => {
    it('should return the user profile when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Check if the response has a user property
      if (response.body.user) {
        // If the response has a user property
        expect(response.body.user).toHaveProperty('id', userId);
        expect(response.body.user).toHaveProperty('username', 'profileuser');
        expect(response.body.user).toHaveProperty('role', UserRole.User);
      } else {
        // If the response is the user object directly
        expect(response.body).toHaveProperty('id', userId);
        expect(response.body).toHaveProperty('username', 'profileuser');
        expect(response.body).toHaveProperty('role', UserRole.User);
      }
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/profile')
        .expect(401);
    });
  });

  describe('PATCH /profile', () => {
    it('should update the user profile when authenticated', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      // Check if the response has the expected structure
      if (response.body.user) {
        // If the response has a user property
        expect(response.body.user).toHaveProperty('id', userId);
        expect(response.body.user).toHaveProperty('firstName', 'Updated');
        expect(response.body.user).toHaveProperty('lastName', 'Name');
        expect(response.body.user).toHaveProperty('username', 'profileuser');
      } else {
        // If the response is the user object directly
        expect(response.body).toHaveProperty('id', userId);
        expect(response.body).toHaveProperty('firstName', 'Updated');
        expect(response.body).toHaveProperty('lastName', 'Name');
        expect(response.body).toHaveProperty('username', 'profileuser');
      }
    });

    it('should return 400 when validation fails', async () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const response = await request(app.getHttpServer())
        .patch('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .patch('/profile')
        .send({ firstName: 'Unauthorized' })
        .expect(401);
    });
  });

  describe('PATCH /profile/picture', () => {
    it('should upload a profile picture when authenticated', async () => {
      // Create a test image file
      const testImagePath = path.join(process.cwd(), 'test-image.jpg');
      fs.writeFileSync(testImagePath, 'test image content');

      const response = await request(app.getHttpServer())
        .patch('/profile/picture')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', testImagePath)
        .expect(200);

      // Check if the response has the expected structure
      if (response.body.user) {
        // If the response has a user property
        expect(response.body.user).toHaveProperty('id', userId);
        expect(response.body.user).toHaveProperty('profilePicture');
        
        // Fix for Windows path separators - check if the path contains 'uploads' and 'profiles'
        expect(response.body.user.profilePicture.includes('uploads')).toBe(true);
        expect(response.body.user.profilePicture.includes('profiles')).toBe(true);
      } else {
        // If the response is the user object directly
        expect(response.body).toHaveProperty('id', userId);
        expect(response.body).toHaveProperty('profilePicture');
        
        // Fix for Windows path separators - check if the path contains 'uploads' and 'profiles'
        expect(response.body.profilePicture.includes('uploads')).toBe(true);
        expect(response.body.profilePicture.includes('profiles')).toBe(true);
      }

      // Clean up test image
      fs.unlinkSync(testImagePath);
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app.getHttpServer())
        .patch('/profile/picture')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.message).toBe('Profile picture file is required');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .patch('/profile/picture')
        .expect(401);
    });
  });

  describe('GET /profile/picture/:id', () => {
    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/profile/picture/${userId}`)
        .expect(401);
    });

    it('should return 401 when trying to access another user\'s picture', async () => {
      // Create another user
      const anotherUser = await prismaService.user.create({
        data: {
          username: 'anotheruser',
          email: 'another@example.com',
          password: await bcrypt.hash('Password123', 10),
          role: UserRole.User,
        },
      });

      try {
        // The test expects 401 Unauthorized, not 403 Forbidden
        await request(app.getHttpServer())
          .get(`/profile/picture/${anotherUser.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(401);
      } finally {
        // Clean up
        await prismaService.user.delete({
          where: { id: anotherUser.id },
        });
      }
    });
  });
});
