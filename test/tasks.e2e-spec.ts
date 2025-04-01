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

describe('Tasks Module (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let userToken: string;
  let userId: number;
  let taskId: number;

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
        username: 'taskuser',
        email: 'task@example.com',
        password: hashedPassword,
        firstName: 'Task',
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
    const uploadsDir = path.join(process.cwd(), 'uploads', 'attachments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create a test task
    const task = await prismaService.task.create({
      data: {
        name: 'Test Task',
        description: 'Test Description',
        userId: userId,
      },
    });
    taskId = task.id;
  });

  afterAll(async () => {
    // Clean up test tasks
    await prismaService.task.deleteMany({
      where: { userId },
    });

    // Clean up test user
    await prismaService.user.delete({
      where: { id: userId },
    });

    await app.close();
  });

  describe('POST /tasks', () => {
    it('should create a new task when authenticated', async () => {
      const newTask = {
        name: 'New Task',
        description: 'New Task Description',
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newTask)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New Task');
      expect(response.body).toHaveProperty('description', 'New Task Description');
      expect(response.body).toHaveProperty('userId', userId);
    });

    it('should return 400 when validation fails', async () => {
      const invalidTask = {
        // Missing name
        description: 'Invalid Task',
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidTask)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({ name: 'Unauthorized Task' })
        .expect(401);
    });
  });

  describe('GET /tasks', () => {
    it('should return tasks with pagination when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
    });

    it('should filter tasks by search term', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks?search=Test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.some(task => task.name === 'Test Task')).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/tasks')
        .expect(401);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return a task by ID when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', taskId);
      expect(response.body).toHaveProperty('name', 'Test Task');
      expect(response.body).toHaveProperty('description', 'Test Description');
      expect(response.body).toHaveProperty('userId', userId);
    });

    it('should return 404 when task does not exist', async () => {
      await request(app.getHttpServer())
        .get('/tasks/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(401);
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should update a task when authenticated', async () => {
      const updateData = {
        name: 'Updated Task',
        description: 'Updated Description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', taskId);
      expect(response.body).toHaveProperty('name', 'Updated Task');
      expect(response.body).toHaveProperty('description', 'Updated Description');
      expect(response.body).toHaveProperty('userId', userId);
    });

    it('should return 404 when task does not exist', async () => {
      await request(app.getHttpServer())
        .patch('/tasks/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Not Found Task' })
        .expect(404);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .send({ name: 'Unauthorized Update' })
        .expect(401);
    });
  });

  describe('POST /tasks/:id/attachment', () => {
    it('should upload an attachment when authenticated', async () => {
      // Create a test file
      const testFilePath = path.join(process.cwd(), 'test-attachment.txt');
      fs.writeFileSync(testFilePath, 'test attachment content');

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/attachment`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', testFilePath)
        .expect(201);

      expect(response.body).toHaveProperty('id', taskId);
      expect(response.body).toHaveProperty('attachment');
      
      // Check if the path contains 'uploads' and 'attachments'
      expect(response.body.attachment.includes('uploads')).toBe(true);
      expect(response.body.attachment.includes('attachments')).toBe(true);

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/attachment`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.message).toBe('Attachment file is required');
    });

    it('should return 404 when task does not exist', async () => {
      // Create a test file
      const testFilePath = path.join(process.cwd(), 'test-attachment.txt');
      fs.writeFileSync(testFilePath, 'test attachment content');

      await request(app.getHttpServer())
        .post('/tasks/9999/attachment')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', testFilePath)
        .expect(404);

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/attachment`)
        .expect(401);
    });
  });

  describe('DELETE /tasks/:id/attachment', () => {
    it('should remove an attachment when authenticated', async () => {
      // First upload an attachment
      const testFilePath = path.join(process.cwd(), 'test-attachment.txt');
      fs.writeFileSync(testFilePath, 'test attachment content');

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/attachment`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', testFilePath)
        .expect(201);

      // Then remove it
      const response = await request(app.getHttpServer())
        .delete(`/tasks/${taskId}/attachment`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', taskId);
      expect(response.body).toHaveProperty('attachment', null);

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should return 404 when task does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/tasks/9999/attachment')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}/attachment`)
        .expect(401);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task when authenticated', async () => {
      // Create a task to delete
      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Task to Delete',
          description: 'This task will be deleted',
        })
        .expect(201);

      const deleteTaskId = createResponse.body.id;

      // Delete the task
      await request(app.getHttpServer())
        .delete(`/tasks/${deleteTaskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);

      // Verify the task is deleted
      await request(app.getHttpServer())
        .get(`/tasks/${deleteTaskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return 404 when task does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/tasks/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .expect(401);
    });
  });
});