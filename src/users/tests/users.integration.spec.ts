import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('Users Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let userToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Clean up the database
    await prismaService.user.deleteMany({});

    // Create an admin user for testing
    const adminUser = await prismaService.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // Password123
        role: UserRole.Admin,
      },
    });

    // Create a regular user for testing
    const regularUser = await prismaService.user.create({
      data: {
        username: 'user',
        email: 'user@example.com',
        password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // Password123
        role: UserRole.User,
      },
    });

    // Generate JWT tokens
    adminToken = jwtService.sign({ 
      sub: adminUser.id, 
      username: adminUser.username,
      role: adminUser.role 
    });
    
    userToken = jwtService.sign({ 
      sub: regularUser.id, 
      username: regularUser.username,
      role: regularUser.role 
    });
  });

  afterAll(async () => {
    await prismaService.user.deleteMany({});
    await app.close();
  });

  describe('POST /users', () => {
    it('should create a new user when admin is authenticated', async () => {
      const newUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(newUser.username);
      expect(response.body.email).toBe(newUser.email);
      expect(response.body.firstName).toBe(newUser.firstName);
      expect(response.body.lastName).toBe(newUser.lastName);
      expect(response.body.role).toBe(UserRole.User); // Default role
      expect(response.body).not.toHaveProperty('password');

      userId = response.body.id;
    });

    it('should return 403 when non-admin user tries to create a user', async () => {
      const newUser = {
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'Password123',
      };

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newUser)
        .expect(403);
    });

    it('should return 400 when validation fails', async () => {
      const invalidUser = {
        username: 'te', // Too short
        email: 'invalid-email',
        password: 'short', // Too short and missing uppercase
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUser)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
      expect(response.body.message.length).toBeGreaterThan(0);
    });
  });

  describe('GET /users', () => {
    it('should return paginated users when admin is authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    it('should return 403 when non-admin user tries to get users', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should filter users by query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ username: 'test' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].username).toContain('test');
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by ID when admin is authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('username');
      expect(response.body).toHaveProperty('email');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 403 when non-admin user tries to get a user', async () => {
      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 404 when user does not exist', async () => {
      await request(app.getHttpServer())
        .get('/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update a user when admin is authenticated', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.lastName).toBe(updateData.lastName);
    });

    it('should return 403 when non-admin user tries to update a user', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Unauthorized' })
        .expect(403);
    });

    it('should return 404 when user does not exist', async () => {
      await request(app.getHttpServer())
        .patch('/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'NotFound' })
        .expect(404);
    });

    it('should return 400 when validation fails', async () => {
      const invalidData = {
        username: 'a', // Too short
      };

      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('PATCH /users/:id/role', () => {
    it('should update a user role when admin is authenticated', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.Admin })
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body.role).toBe(UserRole.Admin);
    });

    it('should return 403 when non-admin user tries to update a role', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${userId}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: UserRole.User })
        .expect(403);
    });

    it('should return 400 when invalid role is provided', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'InvalidRole' })
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should return 403 when non-admin user tries to delete a user', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should delete a user when admin is authenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify the user is deleted
      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 when user does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});