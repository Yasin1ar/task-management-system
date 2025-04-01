import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Create Task DTO
 *
 * This DTO validates task creation data with the following rules:
 * - Task name is required and must be a string with max length of 100 characters
 * - Description is optional and can be a longer text
 *
 * The class uses class-validator decorators for validation and
 * Swagger decorators for API documentation.
 */
export class CreateTaskDto {
  @ApiProperty({ description: 'Task name', example: 'Complete project documentation' })
  @IsNotEmpty({ message: 'Task name is required' })
  @IsString({ message: 'Task name must be a string' })
  @MaxLength(100, { message: 'Task name cannot exceed 100 characters' })
  name: string;

  @ApiProperty({ 
    description: 'Task description', 
    example: 'Write comprehensive documentation for the project including setup instructions and API endpoints.',
    required: false 
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}