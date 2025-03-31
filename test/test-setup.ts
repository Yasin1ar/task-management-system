import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupTestDatabase, teardownTestDatabase } from './test-database';

export class TestSetup {
  app: INestApplication;
  prismaService: PrismaService;
  httpServer: any;

  async initialize() {
    // Create the NestJS application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    
    // Apply global pipes to match the main application
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await this.app.init();
    
    // Get the HTTP server instance for supertest
    this.httpServer = this.app.getHttpServer();
    
    // Get the PrismaService for database operations
    this.prismaService = this.app.get<PrismaService>(PrismaService);
    
    // Setup the test database
    await setupTestDatabase();
  }

  async cleanup() {
    // Clean up the database
    await teardownTestDatabase();
    
    // Close the application
    await this.app.close();
  }

  // Helper method to create a request
  request() {
    return request(this.httpServer);
  }
}
