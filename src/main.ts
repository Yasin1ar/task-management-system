import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Load environment variables
  dotenv.config();
  
  // Validate required environment variables
  const requiredEnvVars = ['JWT_SECRET'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Environment variable ${envVar} is required`);
    }
  }

  // Ensure uploads directories exist
  const uploadDirs = [
    path.join(process.cwd(), 'uploads', 'profiles'),
    path.join(process.cwd(), 'uploads', 'attachments')
  ];
  
  for (const dir of uploadDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Apply validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw errors if non-whitelisted properties are present
      transform: true, // Transform payloads to DTO instances
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Task Management API')
    .setDescription('An API for managing tasks, users, and profiles')
    .setVersion('1.0')
    .addTag('auth')
    .addTag('users')
    .addTag('profile')
    .addTag('tasks')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}
bootstrap();
