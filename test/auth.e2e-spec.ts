import { TestSetup } from './test-setup';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('Auth Module (e2e)', () => {
  const testSetup = new TestSetup();
  let jwtService: JwtService;

  beforeAll(async () => {
    await testSetup.initialize();
    jwtService = testSetup.app.get<JwtService>(JwtService);
  }, 60000); // 60 second timeout

  afterAll(async () => {
    await testSetup.cleanup();
  }, 30000); // 30 second timeout

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await testSetup.request()
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe(newUser.username);
      expect(response.body.user.email).toBe(newUser.email);
      expect(response.body.user.firstName).toBe(newUser.firstName);
      expect(response.body.user.lastName).toBe(newUser.lastName);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify the token is valid
      const decodedToken = jwtService.verify(response.body.token);
      expect(decodedToken).toHaveProperty('sub', response.body.user.id);
      expect(decodedToken).toHaveProperty('username', newUser.username);
    });

    it('should return 400 when validation fails', async () => {
      const invalidUser = {
        username: 'in', // Too short
        email: 'invalid-email',
        password: 'short', // Too short and missing uppercase
      };

      const response = await testSetup.request()
        .post('/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
      expect(response.body.message.length).toBeGreaterThan(0);
    });

    it('should return 400 when neither email nor phone is provided', async () => {
      const invalidUser = {
        username: 'nocontact',
        password: 'Password123',
      };

      const response = await testSetup.request()
        .post('/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.message).toContain('Either email or phone number must be provided');
    });

    it('should return 400 when username is already in use', async () => {
      // First create a user
      const user = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'Password123',
      };

      await testSetup.request()
        .post('/auth/register')
        .send(user)
        .expect(201);

      // Try to create another user with the same username
      const duplicateUser = {
        username: 'existinguser',
        email: 'different@example.com',
        password: 'Password123',
      };

      const response = await testSetup.request()
        .post('/auth/register')
        .send(duplicateUser)
        .expect(400);

      expect(response.body.message).toContain('Username already in use');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      const hashedPassword = await bcrypt.hash('Password123', 10);
      await testSetup.prismaService.user.create({
        data: {
          username: 'loginuser',
          email: 'login@example.com',
          password: hashedPassword,
        },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        username: 'loginuser',
        password: 'Password123',
      };

      const response = await testSetup.request()
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe(loginDto.username);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify the token is valid
      const decodedToken = jwtService.verify(response.body.token);
      expect(decodedToken).toHaveProperty('sub', response.body.user.id);
      expect(decodedToken).toHaveProperty('username', loginDto.username);
    });

    it('should return 401 with invalid credentials', async () => {
      const invalidLogin = {
        username: 'loginuser',
        password: 'WrongPassword123',
      };

      const response = await testSetup.request()
        .post('/auth/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 when user does not exist', async () => {
      const nonExistentUser = {
        username: 'nonexistent',
        password: 'Password123',
      };

      const response = await testSetup.request()
        .post('/auth/login')
        .send(nonExistentUser)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 400 when validation fails', async () => {
      const invalidLogin = {
        username: 'loginuser',
        // Missing password
      };

      const response = await testSetup.request()
        .post('/auth/login')
        .send(invalidLogin)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
    });
  });
});