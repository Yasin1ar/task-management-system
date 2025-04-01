import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Update Task DTO
 *
 * This DTO validates task update data with the following rules:
 * - All fields are optional since this is for partial updates
 * - Task name must be a string with max length of 100 characters if provided
 * - Description must be a string if provided
 *
 * The class uses class-validator decorators for validation and
 * Swagger decorators for API documentation.
 */
export class UpdateTaskDto {
  @ApiProperty({ 
    description: 'Task name', 
    example: 'Updated project documentation',
    required: false 
  })
  @IsOptional()
  @IsString({ message: 'Task name must be a string' })
  @MaxLength(100, { message: 'Task name cannot exceed 100 characters' })
  name?: string;

  @ApiProperty({ 
    description: 'Task description', 
    example: 'Updated comprehensive documentation for the project.',
    required: false 
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}