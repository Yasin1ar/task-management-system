import { TestSetup } from './test-setup';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

describe('Users Module (e2e)', () => {
  const testSetup = new TestSetup();
  let jwtService: JwtService;
  let adminToken: string;
  let userToken: string;
  let testUserId: number;

  // Increase timeout for the beforeAll hook to 60 seconds
  beforeAll(async () => {
    await testSetup.initialize();
    jwtService = testSetup.app.get<JwtService>(JwtService);

    // Create an admin user
    const hashedAdminPassword = await bcrypt.hash('AdminPassword123', 10);
    const admin = await testSetup.prismaService.user.create({
      data: {
        username: 'adminuser',
        email: 'admin@example.com',
        password: hashedAdminPassword,
        role: UserRole.Admin,
      },
    });

    // Create a regular user
    const hashedUserPassword = await bcrypt.hash('UserPassword123', 10);
    const user = await testSetup.prismaService.user.create({
      data: {
        username: 'regularuser',
        email: 'regular@example.com',
        password: hashedUserPassword,
        role: UserRole.User,
      },
    });
    testUserId = user.id;

    // Generate tokens
    adminToken = jwtService.sign({
      sub: admin.id,
      username: admin.username,
      role: admin.role,
    });

    userToken = jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }, 60000); // 60 second timeout

  afterAll(async () => {
    await testSetup.cleanup();
  }, 30000); // 30 second timeout

  describe('POST /users', () => {
    it('should create a new user when admin is authenticated', async () => {
      const newUser = {
        username: 'createduser',
        email: 'created@example.com',
        password: 'Password123',
        firstName: 'Created',
        lastName: 'User',
      };

      const response = await testSetup.request()
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
    });

    it('should return 403 when non-admin user tries to create a user', async () => {
      const newUser = {
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'Password123',
      };

      await testSetup.request()
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

      const response = await testSetup.request()
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
      const response = await testSetup.request()
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
      await testSetup.request()
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should filter users by query parameters', async () => {
      const response = await testSetup.request()
        .get('/users')
        .query({ username: 'regular' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.some(user => user.username === 'regularuser')).toBe(true);
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by ID when admin is authenticated', async () => {
      const response = await testSetup.request()
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUserId);
      expect(response.body).toHaveProperty('username', 'regularuser');
      expect(response.body).toHaveProperty('email', 'regular@example.com');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 403 when non-admin user tries to get a user', async () => {
      await testSetup.request()
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 404 when user does not exist', async () => {
      await testSetup.request()
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

      const response = await testSetup.request()
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUserId);
      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.lastName).toBe(updateData.lastName);
    });

    it('should return 403 when non-admin user tries to update a user', async () => {
      await testSetup.request()
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Unauthorized' })
        .expect(403);
    });

    it('should return 404 when user does not exist', async () => {
      await testSetup.request()
        .patch('/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'NotFound' })
        .expect(404);
    });

    it('should return 400 when validation fails', async () => {
      const invalidData = {
        username: 'a', // Too short
      };

      await testSetup.request()
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('PATCH /users/:id/role', () => {
    let userToUpdateRoleId: number;

    beforeEach(async () => {
      // Create a new user for role update tests
      const hashedPassword = await bcrypt.hash('RoleUpdatePassword123', 10);
      const userToUpdateRole = await testSetup.prismaService.user.create({
        data: {
          username: `roleuser${Date.now()}`,
          email: `roleuser${Date.now()}@example.com`,
          password: hashedPassword,
          role: UserRole.User,
        },
      });
      userToUpdateRoleId = userToUpdateRole.id;
    }, 10000); // 10 second timeout

    it('should update a user role when admin is authenticated', async () => {
      const response = await testSetup.request()
        .patch(`/users/${userToUpdateRoleId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.Admin })
        .expect(200);

      expect(response.body).toHaveProperty('id', userToUpdateRoleId);
      expect(response.body.role).toBe(UserRole.Admin);
    });

    it('should return 403 when non-admin user tries to update a role', async () => {
      await testSetup.request()
        .patch(`/users/${userToUpdateRoleId}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: UserRole.Admin })
        .expect(403);
    });

    it('should return 400 when invalid role is provided', async () => {
      await testSetup.request()
        .patch(`/users/${userToUpdateRoleId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'InvalidRole' })
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    let userToDeleteId: number;

    beforeEach(async () => {
      // Create a user to delete
      const hashedPassword = await bcrypt.hash('DeletePassword123', 10);
      const userToDelete = await testSetup.prismaService.user.create({
        data: {
          username: `deleteuser${Date.now()}`,
          email: `delete${Date.now()}@example.com`,
          password: hashedPassword,
          role: UserRole.User,
        },
      });
      userToDeleteId = userToDelete.id;
    }, 10000); // 10 second timeout

    it('should return 403 when non-admin user tries to delete a user', async () => {
      await testSetup.request()
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should delete a user when admin is authenticated', async () => {
      await testSetup.request()
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify the user is deleted
      await testSetup.request()
        .get(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 when user does not exist', async () => {
      await testSetup.request()
        .delete('/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
