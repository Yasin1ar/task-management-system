import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let userToken: string;
  let testUserId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Clean the database before tests
    await prismaService.user.deleteMany({});

    // Create test users
    const hashedPassword = await bcrypt.hash('Password123', 10);

    const adminUser = await prismaService.user.create({
      data: {
        username: 'admin_test',
        email: 'admin@test.com',
        password: hashedPassword,
        role: UserRole.Admin,
      },
    });

    const regularUser = await prismaService.user.create({
      data: {
        username: 'user_test',
        email: 'user@test.com',
        password: hashedPassword,
        role: UserRole.User,
      },
    });

    // Generate JWT tokens
    adminToken = jwtService.sign({
      sub: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
    });

    userToken = jwtService.sign({
      sub: regularUser.id,
      username: regularUser.username,
      role: regularUser.role,
    });
  });

  afterAll(async () => {
    await prismaService.user.deleteMany({});
    await app.close();
  });

  describe('POST /users', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          username: 'newuser',
          email: 'new@test.com',
          password: 'Password123',
        })
        .expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'newuser',
          email: 'new@test.com',
          password: 'Password123',
        })
        .expect(403);
    });

    it('should validate input data', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'a', // Too short
          email: 'invalid-email',
          password: 'short', // Too short and missing uppercase
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeInstanceOf(Array);
          expect(res.body.message.length).toBeGreaterThan(0);
        });
    });

    it('should create a new user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          email: 'new@test.com',
          password: 'Password123',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.username).toBe('newuser');
          expect(res.body.email).toBe('new@test.com');
          expect(res.body.firstName).toBe('New');
          expect(res.body.lastName).toBe('User');
          expect(res.body.role).toBe(UserRole.User);
          expect(res.body).not.toHaveProperty('password');
          
          // Save the user ID for later tests
          testUserId = res.body.id;
        });
    });

    it('should not allow duplicate username', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser', // Already exists
          email: 'another@test.com',
          password: 'Password123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Username already in use');
        });
    });

    it('should not allow duplicate email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'anotheruser',
          email: 'new@test.com', // Already exists
          password: 'Password123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Email already in use');
        });
    });
  });

  describe('GET /users', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return paginated users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
          expect(res.body.meta).toHaveProperty('totalPages');
        });
    });

    it('should apply filters correctly', () => {
      return request(app.getHttpServer())
        .get('/users?username=new')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].username).toContain('new');
        });
    });

    it('should handle pagination correctly', () => {
      return request(app.getHttpServer())
        .get('/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeLessThanOrEqual(2);
          expect(res.body.meta.page).toBe(1);
          expect(res.body.meta.limit).toBe(2);
        });
    });
  });

  describe('GET /users/:id', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return a user by ID', () => {
      return request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testUserId);
          expect(res.body.username).toBe('newuser');
          expect(res.body.email).toBe('new@test.com');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .send({ firstName: 'Updated' })
        .expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Updated' })
        .expect(403);
    });

    it('should update a user', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testUserId);
          expect(res.body.firstName).toBe('Updated');
          expect(res.body.lastName).toBe('Name');
        });
    });

    it('should validate update data', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'a', // Too short
        })
        .expect(400);
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .patch('/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'NotFound' })
        .expect(404);
    });
  });

  describe('PATCH /users/:id/role', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUserId}/role`)
        .send({ role: UserRole.Admin })
        .expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: UserRole.Admin })
        .expect(403);
    });

    it('should update a user role', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.Admin })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testUserId);
          expect(res.body.role).toBe(UserRole.Admin);
        });
    });

    it('should validate role value', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'InvalidRole' })
        .expect(400);
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .patch('/users/9999/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.User })
        .expect(404);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .delete(`/users/${testUserId}`)
        .expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should delete a user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should return 404 after user is deleted', () => {
      return request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .delete('/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});