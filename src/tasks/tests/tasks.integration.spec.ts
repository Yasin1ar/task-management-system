import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TasksService } from '../tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskQueryDto, SortOrder, SortField } from '../dto/task-query.dto';

describe('TasksService Integration Tests', () => {
  let app: INestApplication;
  let tasksService: TasksService;
  let prismaService: PrismaService;
  let userId: number;
  let taskId: number;
  let testFilePath: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [TasksService, PrismaService],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    tasksService = moduleFixture.get<TasksService>(TasksService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Create a test user
    const hashedPassword = await bcrypt.hash('Password123', 10);
    const user = await prismaService.user.create({
      data: {
        username: 'taskintegration',
        email: 'taskintegration@example.com',
        password: hashedPassword,
        firstName: 'Task',
        lastName: 'Integration',
        role: UserRole.User,
      },
    });
    userId = user.id;

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'attachments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create a test file
    testFilePath = path.join(uploadsDir, 'test-integration-attachment.txt');
    fs.writeFileSync(testFilePath, 'test attachment content');

    // Create a test task
    const task = await prismaService.task.create({
      data: {
        name: 'Integration Test Task',
        description: 'Integration Test Description',
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

    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    await app.close();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const createTaskDto: CreateTaskDto = {
        name: 'New Integration Task',
        description: 'New Integration Task Description',
      };

      const task = await tasksService.createTask(userId, createTaskDto);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.name).toBe(createTaskDto.name);
      expect(task.description).toBe(createTaskDto.description);
      expect(task.userId).toBe(userId);
    });
  });

  describe('getTasks', () => {
    it('should return tasks with pagination metadata', async () => {
      const queryDto: TaskQueryDto = {
        page: 1,
        limit: 10,
        sortBy: SortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
      };

      const result = await tasksService.getTasks(userId, queryDto);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toBeGreaterThanOrEqual(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should filter tasks by search term', async () => {
      const queryDto: TaskQueryDto = {
        page: 1,
        limit: 10,
        sortBy: SortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
        search: 'Integration',
      };

      const result = await tasksService.getTasks(userId, queryDto);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some(task => task.name.includes('Integration'))).toBe(true);
    });
  });

  describe('getTaskById', () => {
    it('should return a task by ID', async () => {
      const task = await tasksService.getTaskById(taskId, userId);

      expect(task).toBeDefined();
      expect(task.id).toBe(taskId);
      expect(task.name).toBe('Integration Test Task');
      expect(task.description).toBe('Integration Test Description');
      expect(task.userId).toBe(userId);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      await expect(tasksService.getTaskById(9999, userId)).rejects.toThrow('Task not found');
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      // Create another user
      const otherUser = await prismaService.user.create({
        data: {
          username: 'otheruser',
          email: 'other@example.com',
          password: await bcrypt.hash('Password123', 10),
          role: UserRole.User,
        },
      });

      try {
        await expect(tasksService.getTaskById(taskId, otherUser.id)).rejects.toThrow(
          'You can only access your own tasks'
        );
      } finally {
        // Clean up
        await prismaService.user.delete({
          where: { id: otherUser.id },
        });
      }
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      const updateTaskDto: UpdateTaskDto = {
        name: 'Updated Integration Task',
        description: 'Updated Integration Description',
      };

      const updatedTask = await tasksService.updateTask(taskId, userId, updateTaskDto);

      expect(updatedTask).toBeDefined();
      expect(updatedTask.id).toBe(taskId);
      expect(updatedTask.name).toBe(updateTaskDto.name);
      expect(updatedTask.description).toBe(updateTaskDto.description);
      expect(updatedTask.userId).toBe(userId);
    });
  });

  describe('addAttachment', () => {
    it('should add attachment to a task successfully', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        destination: './uploads/attachments',
        filename: 'test-integration-attachment.txt',
        path: testFilePath,
        size: 12345,
      } as Express.Multer.File;

      const updatedTask = await tasksService.addAttachment(taskId, userId, mockFile);

      expect(updatedTask).toBeDefined();
      expect(updatedTask.id).toBe(taskId);
      expect(updatedTask.attachment).toBe(testFilePath);
    });
  });

  describe('getAttachment', () => {
    it('should return attachment path', async () => {
      const attachmentPath = await tasksService.getAttachment(taskId, userId);

      expect(attachmentPath).toBeDefined();
      expect(attachmentPath).toBe(testFilePath);
    });
  });

  describe('removeAttachment', () => {
    it('should remove attachment successfully', async () => {
      const updatedTask = await tasksService.removeAttachment(taskId, userId);

      expect(updatedTask).toBeDefined();
      expect(updatedTask.id).toBe(taskId);
      expect(updatedTask.attachment).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      // Create a task to delete
      const createTaskDto: CreateTaskDto = {
        name: 'Task to Delete',
        description: 'This task will be deleted',
      };

      const taskToDelete = await tasksService.createTask(userId, createTaskDto);
      
      // Delete the task
      await tasksService.deleteTask(taskToDelete.id, userId);
      
      // Verify the task is deleted
      await expect(tasksService.getTaskById(taskToDelete.id, userId)).rejects.toThrow('Task not found');
    });
  });
});