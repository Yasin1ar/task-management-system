import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as path from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

/**
 * Tasks Controller
 *
 * This controller handles HTTP requests related to tasks:
 * - Creating, reading, updating, and deleting tasks
 * - Uploading and downloading task attachments
 * - Listing tasks with pagination, sorting, and filtering
 */
@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.createTask(user.id, createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (starts from 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['id', 'name', 'createdAt', 'updatedAt'], description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term to filter tasks' })
  getTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryDto: TaskQueryDto,
  ) {
    return this.tasksService.getTasks(user.id, queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  getTask(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.getTaskById(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  updateTask(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(id, user.id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({
    status: 204,
    description: 'Task deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async deleteTask(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    await this.tasksService.deleteTask(id, user.id);
    return res.status(204).send();
  }

  @Post(':id/attachment')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload task attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Attachment file',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Attachment uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  addAttachment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }
    return this.tasksService.addAttachment(id, user.id, file);
  }

  @Get(':id/attachment')
  @ApiOperation({ summary: 'Download task attachment' })
  @ApiResponse({
    status: 200,
    description: 'Attachment downloaded successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your task' })
  @ApiResponse({ status: 404, description: 'Task or attachment not found' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async getAttachment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const attachmentPath = await this.tasksService.getAttachment(id, user.id);
    return res.sendFile(path.resolve(attachmentPath));
  }

  @Delete(':id/attachment')
  @ApiOperation({ summary: 'Remove task attachment' })
  @ApiResponse({
    status: 200,
    description: 'Attachment removed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your task' })
  @ApiResponse({ status: 404, description: 'Task or attachment not found' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  removeAttachment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.removeAttachment(id, user.id);
  }
}