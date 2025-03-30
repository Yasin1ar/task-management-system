/**
 * Application E2E Tests
 *
 * This test suite validates the basic functionality of the application:
 * - Application startup
 * - Root endpoint response
 * - API information endpoint
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('name', 'Task Management API');
        expect(res.body).toHaveProperty('version');
        expect(res.body).toHaveProperty('description');
      });
  });

  it('/docs (GET) should redirect to Swagger docs', () => {
    return request(app.getHttpServer())
      .get('/docs')
      .expect(302)
      .expect('Location', 'api/docs');
  });
});
