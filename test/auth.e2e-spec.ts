/**
 * Authentication Module E2E Tests
 * 
 * This test suite validates the complete authentication flow:
 * - User registration with validation
 * - Login functionality
 * - JWT token validation
 * - Protected route access
 * - Role-based authorization
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestDatabase, teardownTestDatabase } from './setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken: string;
  let testUserId: number;

  // Test user data
  const testUser = {
    username: 'e2etestuser',
    password: 'TestPassword123',
    email: 'e2etest@example.com',
    firstName: 'E2E',
    lastName: 'Test'
  };

  // Setup before all tests
  beforeAll(async () => {
    // Create the NestJS application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same pipes and configuration as in the main.ts file
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
    
    // Get the PrismaService for database operations
    prisma = app.get<PrismaService>(PrismaService);
    
    // Reset the database to a clean state
    await setupTestDatabase();
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up the database
    await teardownTestDatabase();
    
    // Close the application
    await app.close();
  });

  // Registration tests
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      // Verify the response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username', testUser.username);
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
      
      // Store the JWT token for later tests
      jwtToken = response.body.token;
      testUserId = response.body.user.id;
    });

    it('should reject registration with duplicate username', async () => {
      const duplicateUser = { ...testUser, email: 'different@example.com' };
      
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(duplicateUser)
        .expect(400);
      
      expect(response.body.message).toBe('Username already in use');
    });

    it('should reject registration with duplicate email', async () => {
      const duplicateUser = { ...testUser, username: 'differentuser' };
      
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(duplicateUser)
        .expect(400);
      
      expect(response.body.message).toBe('Email already in use');
    });

    it('should reject registration without required fields', async () => {
      const incompleteUser = {
        username: 'incomplete',
        // Missing password and email
      };
      
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(incompleteUser)
        .expect(400);
      
      // Check if any of the error messages mention 'password'
      const messages = Array.isArray(response.body.message) 
        ? response.body.message 
        : [response.body.message];
      
      const hasPasswordError = messages.some(msg => 
        typeof msg === 'string' && msg.toLowerCase().includes('password')
      );
      
      expect(hasPasswordError).toBe(true);
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordUser = {
        ...testUser,
        username: 'weakpassuser',
        email: 'weak@example.com',
        password: 'weak' // Too short and no uppercase
      };
      
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(weakPasswordUser)
        .expect(400);
      
      // Check if any of the error messages mention 'Password'
      const messages = Array.isArray(response.body.message) 
        ? response.body.message 
        : [response.body.message];
      
      const hasPasswordError = messages.some(msg => 
        typeof msg === 'string' && msg.toLowerCase().includes('password')
      );
      
      expect(hasPasswordError).toBe(true);
    });
  });

  // Login tests
  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('username', testUser.username);
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: 'WrongPassword123'
        })
        .expect(401);
      
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with non-existent username', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nonexistentuser',
          password: testUser.password
        })
        .expect(401);
      
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  // Protected route tests
  describe('Protected Routes', () => {
    // We need to add a protected route to test JWT authentication
    // This assumes you've added the protected route to app.controller.ts as suggested earlier
    
    it('should access protected route with valid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/protected')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'This is a protected route');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username', testUser.username);
    });

    it('should reject access to protected route without token', async () => {
      await request(app.getHttpServer())
        .get('/protected')
        .expect(401);
    });

    it('should reject access with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // Role-based authorization tests
  describe('Role-Based Authorization', () => {
    // This test requires adding an admin-only route to test role-based authorization
    // For example, you could add a route like GET /admin-only that requires Admin role
    
    it('should create an admin user for testing', async () => {
      // Create an admin user directly in the database with properly hashed password
      const hashedPassword = await bcrypt.hash('AdminPassword123', 10);
      
      const adminUser = await prisma.user.create({
        data: {
          username: 'adminuser',
          email: 'admin@example.com',
          password: hashedPassword,
          role: UserRole.Admin
        }
      });
      
      expect(adminUser).toHaveProperty('id');
      expect(adminUser).toHaveProperty('role', UserRole.Admin);
      
      // Login as admin to get token
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'adminuser',
          password: 'AdminPassword123'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('token');
      const adminToken = response.body.token;
      
      // Now we can test admin-only routes if they exist
      // This is a placeholder for when you implement admin routes
      // For now, we'll just verify we have the admin token
      expect(adminToken).toBeDefined();
    });
  });

  // Cleanup test data after tests
  afterAll(async () => {
    // Delete the test user
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId }
      }).catch(e => console.log('Error deleting test user:', e));
    }
    
    // Delete the admin user
    await prisma.user.deleteMany({
      where: { username: 'adminuser' }
    }).catch(e => console.log('Error deleting admin user:', e));
  });
});
