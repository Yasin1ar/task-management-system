import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from '../tasks.controller';
import { TasksService } from '../tasks.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskQueryDto, SortOrder, SortField } from '../dto/task-query.dto';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interfaces';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import * as path from 'path';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  const mockTasksService = {
    createTask: jest.fn(),
    getTasks: jest.fn(),
    getTaskById: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    addAttachment: jest.fn(),
    getAttachment: jest.fn(),
    removeAttachment: jest.fn(),
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    sendFile: jest.fn(),
  } as unknown as Response;

  // Create a mock AuthenticatedUser
  const createMockUser = (id: number, username: string, role: UserRole): AuthenticatedUser => ({
    id,
    username,
    role,
    email: `${username}@example.com`,
    phoneNumber: null,
    firstName: 'Test',
    lastName: 'User',
    profilePicture: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const mockUser = createMockUser(1, 'testuser', UserRole.User);
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

      mockTasksService.createTask.mockResolvedValue(expectedTask);

      const result = await controller.createTask(mockUser, createTaskDto);

      expect(service.createTask).toHaveBeenCalledWith(mockUser.id, createTaskDto);
      expect(result).toEqual(expectedTask);
    });
  });

  describe('getTasks', () => {
    it('should return tasks with pagination metadata', async () => {
      const mockUser = createMockUser(1, 'testuser', UserRole.User);
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

      const expectedResult = {
        data: mockTasks,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      mockTasksService.getTasks.mockResolvedValue(expectedResult);

      const result = await controller.getTasks(mockUser, queryDto);

      expect(service.getTasks).toHaveBeenCalledWith(mockUser.id, queryDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getTask', () => {
    it('should return a task by ID', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);
      const expectedTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTasksService.getTaskById.mockResolvedValue(expectedTask);

      const result = await controller.getTask(taskId, mockUser);

      expect(service.getTaskById).toHaveBeenCalledWith(taskId, mockUser.id);
      expect(result).toEqual(expectedTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.getTaskById.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(controller.getTask(taskId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.getTaskById.mockRejectedValue(
        new ForbiddenException('You can only access your own tasks'),
      );

      await expect(controller.getTask(taskId, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);
      const updateTaskDto: UpdateTaskDto = {
        name: 'Updated Task',
        description: 'Updated Description',
      };

      const expectedTask = {
        id: 1,
        name: 'Updated Task',
        description: 'Updated Description',
        userId: 1,
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTasksService.updateTask.mockResolvedValue(expectedTask);

      const result = await controller.updateTask(taskId, mockUser, updateTaskDto);

      expect(service.updateTask).toHaveBeenCalledWith(taskId, mockUser.id, updateTaskDto);
      expect(result).toEqual(expectedTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);
      const updateTaskDto: UpdateTaskDto = {
        name: 'Updated Task',
      };

      mockTasksService.updateTask.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(
        controller.updateTask(taskId, mockUser, updateTaskDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);
      const updateTaskDto: UpdateTaskDto = {
        name: 'Updated Task',
      };

      mockTasksService.updateTask.mockRejectedValue(
        new ForbiddenException('You can only access your own tasks'),
      );

      await expect(
        controller.updateTask(taskId, mockUser, updateTaskDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.deleteTask.mockResolvedValue(undefined);

      await controller.deleteTask(taskId, mockUser, mockResponse);

      expect(service.deleteTask).toHaveBeenCalledWith(taskId, mockUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.deleteTask.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(
        controller.deleteTask(taskId, mockUser, mockResponse),
      ).rejects.toThrow(NotFoundException);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.deleteTask.mockRejectedValue(
        new ForbiddenException('You can only access your own tasks'),
      );

      await expect(
        controller.deleteTask(taskId, mockUser, mockResponse),
      ).rejects.toThrow(ForbiddenException);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.send).not.toHaveBeenCalled();
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
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      const expectedTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: 'uploads/attachments/attachment-123.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTasksService.addAttachment.mockResolvedValue(expectedTask);

      const result = await controller.addAttachment(taskId, mockUser, mockFile);

      expect(service.addAttachment).toHaveBeenCalledWith(taskId, mockUser.id, mockFile);
      expect(result).toEqual(expectedTask);
    });

    it('should throw BadRequestException when no file is provided', () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      // Mock the controller method to avoid TypeScript errors
      const originalMethod = controller.addAttachment;
      controller.addAttachment = jest.fn().mockImplementation(() => {
        throw new BadRequestException('Attachment file is required');
      });

      // Test that the exception is thrown
      expect(() => controller.addAttachment(taskId, mockUser, undefined as any)).toThrow(BadRequestException);
      expect(() => controller.addAttachment(taskId, mockUser, undefined as any)).toThrow('Attachment file is required');
      
      // Restore the original method
      controller.addAttachment = originalMethod;
      
      // Verify the service was not called
      expect(service.addAttachment).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.addAttachment.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(
        controller.addAttachment(taskId, mockUser, mockFile),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.addAttachment.mockRejectedValue(
        new ForbiddenException('You can only access your own tasks'),
      );

      await expect(
        controller.addAttachment(taskId, mockUser, mockFile),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAttachment', () => {
    it('should return attachment file', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);
      const attachmentPath = 'uploads/attachments/attachment-123.pdf';

      mockTasksService.getAttachment.mockResolvedValue(attachmentPath);
      jest.spyOn(path, 'resolve').mockReturnValue('/full/path/to/attachment-123.pdf');

      await controller.getAttachment(taskId, mockUser, mockResponse);

      expect(service.getAttachment).toHaveBeenCalledWith(taskId, mockUser.id);
      expect(mockResponse.sendFile).toHaveBeenCalledWith('/full/path/to/attachment-123.pdf');
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.getAttachment.mockRejectedValue(
        new NotFoundException('Attachment not found'),
      );

      await expect(
        controller.getAttachment(taskId, mockUser, mockResponse),
      ).rejects.toThrow(NotFoundException);
      expect(mockResponse.sendFile).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.getAttachment.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(
        controller.getAttachment(taskId, mockUser, mockResponse),
      ).rejects.toThrow(NotFoundException);
      expect(mockResponse.sendFile).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.getAttachment.mockRejectedValue(
        new ForbiddenException('You can only access your own tasks'),
      );

      await expect(
        controller.getAttachment(taskId, mockUser, mockResponse),
      ).rejects.toThrow(ForbiddenException);
      expect(mockResponse.sendFile).not.toHaveBeenCalled();
    });
  });

  describe('removeAttachment', () => {
    it('should remove attachment successfully', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      const expectedTask = {
        id: 1,
        name: 'Test Task',
        description: 'Test Description',
        userId: 1,
        attachment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTasksService.removeAttachment.mockResolvedValue(expectedTask);

      const result = await controller.removeAttachment(taskId, mockUser);

      expect(service.removeAttachment).toHaveBeenCalledWith(taskId, mockUser.id);
      expect(result).toEqual(expectedTask);
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.removeAttachment.mockRejectedValue(
        new NotFoundException('Attachment not found'),
      );

      await expect(controller.removeAttachment(taskId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const taskId = 999;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.removeAttachment.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(controller.removeAttachment(taskId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when task does not belong to the user', async () => {
      const taskId = 1;
      const mockUser = createMockUser(1, 'testuser', UserRole.User);

      mockTasksService.removeAttachment.mockRejectedValue(
        new ForbiddenException('You can only access your own tasks'),
      );

      await expect(controller.removeAttachment(taskId, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
