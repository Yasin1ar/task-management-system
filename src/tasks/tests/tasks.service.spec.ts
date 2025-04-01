import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from '../tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskQueryDto, SortOrder, SortField } from '../dto/task-query.dto';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

describe('TasksService', () => {
  let service: TasksService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const userId = 1;
      const createTaskDto: CreateTaskDto = {
        name: 'Test Task',
        description: 'Test Description',
      };

      const expectedTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.create.mockResolvedValue(expectedTask);

      const result = await service.createTask(userId, createTaskDto);

      expect(mockPrismaService.task.create).toHaveBeenCalledWith({
        data: {
          ...createTaskDto,
          userId,
        },
      });
      expect(result).toEqual(expectedTask);
    });
  });

  describe('getTasks', () => {
    it('should return tasks with pagination metadata', async () => {
      const userId = 1;
      const queryDto: TaskQueryDto = {
        page: 1,
        limit: 10,
        sortBy: SortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
      };

      const mockTasks = [
        {
          id: 1,
          name: 'Task 1',
          description: 'Description 1',
          userId: 1,
          attachment: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'Task 2',
          description: 'Description 2',
          userId: 1,
          attachment: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.task.count.mockResolvedValue(2);
      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.getTasks(userId, queryDto);

      expect(mockPrismaService.task.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith({
        where: { userId },
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual({
        data: mockTasks,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      });
    });

    it('should apply search filter when provided', async () => {
      const userId = 1;
      const queryDto: TaskQueryDto = {
        page: 1,
        limit: 10,
        sortBy: SortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
        search: 'test',
      };

      mockPrismaService.task.count.mockResolvedValue(1);
      mockPrismaService.task.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Test Task',
          description: 'Test Description',
          userId: 1,
          attachment: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await service.getTasks(userId, queryDto);

      expect(mockPrismaService.task.count).toHaveBeenCalledWith({
        where: {
          userId,
          OR: [
            { name: { contains: 'test' } },
            { description: { contains: 'test' } },
          ],
        },
      });
      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          OR: [
            { name: { contains: 'test' } },
            { description: { contains: 'test' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('getTaskById', () => {
    it('should return a task when it exists and belongs to the user', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.getTaskById(taskId, userId);

      expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
      });
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const userId = 1;

      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.getTaskById(taskId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getTaskById(taskId, userId)).rejects.toThrow(
        'Task not found',
      );
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 2, // Different user ID
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(service.getTaskById(taskId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getTaskById(taskId, userId)).rejects.toThrow(
        'You can only access your own tasks',
      );
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      const taskId = 1;
      const userId = 1;
      const updateTaskDto: UpdateTaskDto = {
        name: 'Updated Task',
        description: 'Updated Description',
      };

      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedTask = {
        ...mockTask,
        name: 'Updated Task',
        description: 'Updated Description',
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const result = await service.updateTask(taskId, userId, updateTaskDto);

      expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
      });
      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: updateTaskDto,
      });
      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const userId = 1;
      const updateTaskDto: UpdateTaskDto = {
        name: 'Updated Task',
      };

      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTask(taskId, userId, updateTaskDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const userId = 1;
      const updateTaskDto: UpdateTaskDto = {
        name: 'Updated Task',
      };

      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 2, // Different user ID
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.updateTask(taskId, userId, updateTaskDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.delete.mockResolvedValue(mockTask);

      await service.deleteTask(taskId, userId);

      expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
      });
      expect(mockPrismaService.task.delete).toHaveBeenCalledWith({
        where: { id: taskId },
      });
    });

    it('should delete attachment file if it exists', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: 'uploads/attachments/file.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.delete.mockResolvedValue(mockTask);

      // Mock fs.existsSync and fs.unlinkSync
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
      (path.join as jest.Mock).mockReturnValue('full/path/to/file.pdf');

      await service.deleteTask(taskId, userId);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockPrismaService.task.delete).toHaveBeenCalledWith({
        where: { id: taskId },
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const userId = 1;

      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.deleteTask(taskId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 2, // Different user ID
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(service.deleteTask(taskId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addAttachment', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      destination: './uploads/attachments',
      filename: 'attachment-123.pdf',
      path: 'uploads/attachments/attachment-123.pdf',
      size: 12345,
    } as Express.Multer.File;

    it('should add attachment to a task successfully', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedTask = {
        ...mockTask,
        attachment: mockFile.path,
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const result = await service.addAttachment(taskId, userId, mockFile);

      expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
      });
      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          attachment: mockFile.path,
        },
      });
      expect(result).toEqual(updatedTask);
    });

    it('should replace existing attachment if it exists', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: 'uploads/attachments/old-file.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedTask = {
        ...mockTask,
        attachment: mockFile.path,
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      // Mock fs.existsSync and fs.unlinkSync
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
      (path.join as jest.Mock).mockReturnValue('full/path/to/old-file.pdf');

      const result = await service.addAttachment(taskId, userId, mockFile);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          attachment: mockFile.path,
        },
      });
      expect(result).toEqual(updatedTask);
    });

    it('should throw BadRequestException when no file is provided', async () => {
      const taskId = 1;
      const userId = 1;

      // Use the async/await pattern with rejects for async functions
      await expect(
        service.addAttachment(taskId, userId, undefined as unknown as Express.Multer.File)
      ).rejects.toThrow(BadRequestException);
      
      await expect(
        service.addAttachment(taskId, userId, undefined as unknown as Express.Multer.File)
      ).rejects.toThrow('Attachment file is required');
      
      // Verify no service methods were called
      expect(mockPrismaService.task.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.task.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const userId = 1;

      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.addAttachment(taskId, userId, mockFile),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 2, // Different user ID
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.addAttachment(taskId, userId, mockFile),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAttachment', () => {
    it('should return attachment path when it exists', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: 'uploads/attachments/file.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.getAttachment(taskId, userId);

      expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
      });
      expect(result).toEqual(mockTask.attachment);
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(service.getAttachment(taskId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getAttachment(taskId, userId)).rejects.toThrow(
        'Attachment not found',
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const userId = 1;

      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.getAttachment(taskId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 2, // Different user ID
        attachment: 'uploads/attachments/file.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(service.getAttachment(taskId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('removeAttachment', () => {
    it('should remove attachment successfully', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: 'uploads/attachments/file.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedTask = {
        ...mockTask,
        attachment: null,
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      // Mock fs.existsSync and fs.unlinkSync
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
      (path.join as jest.Mock).mockReturnValue('full/path/to/file.pdf');

      const result = await service.removeAttachment(taskId, userId);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          attachment: null,
        },
      });
      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(service.removeAttachment(taskId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeAttachment(taskId, userId)).rejects.toThrow(
        'Attachment not found',
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const userId = 1;

      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.removeAttachment(taskId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const userId = 1;
      const mockTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 2, // Different user ID
        attachment: 'uploads/attachments/file.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(service.removeAttachment(taskId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
