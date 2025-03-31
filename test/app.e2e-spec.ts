import { TestSetup } from './test-setup';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

describe('App Module (e2e)', () => {
  const testSetup = new TestSetup();
  let jwtService: JwtService;
  let userToken: string;
  let userId: number;

  beforeAll(async () => {
    await testSetup.initialize();
    jwtService = testSetup.app.get<JwtService>(JwtService);

    // Create a test user
    const hashedPassword = await bcrypt.hash('Password123', 10);
    const user = await testSetup.prismaService.user.create({
      data: {
        username: 'appuser',
        email: 'app@example.com',
        password: hashedPassword,
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
  }, 60000); // 60 second timeout

  afterAll(async () => {
    await testSetup.cleanup();
  }, 30000); // 30 second timeout

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await testSetup.request()
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('GET /docs', () => {
    it('should redirect to API documentation', async () => {
      const response = await testSetup.request()
        .get('/docs')
        .expect(302);

      expect(response.header.location).toBe('api/docs');
    });
  });

  describe('GET /profile', () => {
    it('should return user profile when authenticated', async () => {
      const response = await testSetup.request()
        .get('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', userId);
      expect(response.body.user).toHaveProperty('username', 'appuser');
      expect(response.body.user).toHaveProperty('role', UserRole.User);
    });

    it('should return 401 when not authenticated', async () => {
      await testSetup.request()
        .get('/profile')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await testSetup.request()
        .get('/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});