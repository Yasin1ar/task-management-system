import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto, SortOrder } from './dto/task-query.dto';
import { Task } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tasks Service
 *
 * This service handles task operations:
 * - Creating, reading, updating, and deleting tasks
 * - Managing task attachments
 * - Listing tasks with pagination, sorting, and filtering
 * - Ensuring users can only access their own tasks
 */
@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new task for a user
   * @param userId The ID of the authenticated user
   * @param createTaskDto The data to create the task
   * @returns The created task
   */
  async createTask(userId: number, createTaskDto: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({
      data: {
        ...createTaskDto,
        userId,
      },
    });
  }

  /**
   * Get all tasks for a user with pagination, sorting, and filtering
   * @param userId The ID of the authenticated user
   * @param queryDto The query parameters for pagination, sorting, and filtering
   * @returns An object containing the tasks and pagination metadata
   */
  async getTasks(userId: number, queryDto: TaskQueryDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = SortOrder.DESC, search } = queryDto;
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build the where clause for filtering
    const where = {
      userId,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    };

    // Get total count for pagination metadata
    const total = await this.prisma.task.count({ where });

    // Get tasks with pagination, sorting, and filtering
    const tasks = await this.prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder.toLowerCase(),
      },
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };
  }

  /**
   * Get a task by ID
   * @param taskId The ID of the task to retrieve
   * @param userId The ID of the authenticated user
   * @returns The task if found and owned by the user
   * @throws NotFoundException if the task is not found
   * @throws ForbiddenException if the task is not owned by the user
   */
  async getTaskById(taskId: number, userId: number): Promise<Task> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if the task belongs to the user
    if (task.userId !== userId) {
      throw new ForbiddenException('You can only access your own tasks');
    }

    return task;
  }

  /**
   * Update a task
   * @param taskId The ID of the task to update
   * @param userId The ID of the authenticated user
   * @param updateTaskDto The data to update the task
   * @returns The updated task
   * @throws NotFoundException if the task is not found
   * @throws ForbiddenException if the task is not owned by the user
   */
  async updateTask(
    taskId: number,
    userId: number,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    // Check if the task exists and belongs to the user
    await this.getTaskById(taskId, userId);

    // Update the task
    return this.prisma.task.update({
      where: { id: taskId },
      data: updateTaskDto,
    });
  }

  /**
   * Delete a task
   * @param taskId The ID of the task to delete
   * @param userId The ID of the authenticated user
   * @throws NotFoundException if the task is not found
   * @throws ForbiddenException if the task is not owned by the user
   */
  async deleteTask(taskId: number, userId: number): Promise<void> {
    // Check if the task exists and belongs to the user
    const task = await this.getTaskById(taskId, userId);

    // Delete the attachment if it exists
    if (task.attachment) {
      try {
        const attachmentPath = path.join(process.cwd(), task.attachment);
        if (fs.existsSync(attachmentPath)) {
          fs.unlinkSync(attachmentPath);
        }
      } catch (error) {
        console.error('Error deleting task attachment:', error);
        // Continue even if deletion fails
      }
    }

    // Delete the task
    await this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  /**
   * Add or update an attachment to a task
   * @param taskId The ID of the task
   * @param userId The ID of the authenticated user
   * @param file The uploaded attachment file
   * @returns The updated task with the attachment
   * @throws NotFoundException if the task is not found
   * @throws ForbiddenException if the task is not owned by the user
   * @throws BadRequestException if no file is provided
   */
  async addAttachment(
    taskId: number,
    userId: number,
    file: Express.Multer.File,
  ): Promise<Task> {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }

    // Check if the task exists and belongs to the user
    const task = await this.getTaskById(taskId, userId);

    // Delete old attachment if it exists
    if (task.attachment) {
      try {
        const oldAttachmentPath = path.join(process.cwd(), task.attachment);
        if (fs.existsSync(oldAttachmentPath)) {
          fs.unlinkSync(oldAttachmentPath);
        }
      } catch (error) {
        console.error('Error deleting old attachment:', error);
        // Continue even if deletion fails
      }
    }

    // Update the task with the new attachment path
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        attachment: file.path,
      },
    });
  }

  /**
   * Get a task attachment
   * @param taskId The ID of the task
   * @param userId The ID of the authenticated user
   * @returns The path to the attachment
   * @throws NotFoundException if the task or attachment is not found
   * @throws ForbiddenException if the task is not owned by the user
   */
  async getAttachment(taskId: number, userId: number): Promise<string> {
    // Check if the task exists and belongs to the user
    const task = await this.getTaskById(taskId, userId);

    // Check if attachment exists
    if (!task.attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return task.attachment;
  }

  /**
   * Remove an attachment from a task
   * @param taskId The ID of the task
   * @param userId The ID of the authenticated user
   * @returns The updated task without the attachment
   * @throws NotFoundException if the task or attachment is not found
   * @throws ForbiddenException if the task is not owned by the user
   */
  async removeAttachment(taskId: number, userId: number): Promise<Task> {
    // Check if the task exists and belongs to the user
    const task = await this.getTaskById(taskId, userId);

    // Check if attachment exists
    if (!task.attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Delete the attachment file
    try {
      const attachmentPath = path.join(process.cwd(), task.attachment);
      if (fs.existsSync(attachmentPath)) {
        fs.unlinkSync(attachmentPath);
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      // Continue even if deletion fails
    }

    // Update the task to remove the attachment reference
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        attachment: null,
      },
    });
  }
}