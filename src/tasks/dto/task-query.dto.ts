import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Sort order enum for task queries
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Sort field enum for task queries
 */
export enum SortField {
  ID = 'id',
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

/**
 * Task Query DTO
 *
 * This DTO validates query parameters for task listing with the following features:
 * - Pagination (page, limit)
 * - Sorting (sortBy, sortOrder)
 * - Filtering (search)
 *
 * The class uses class-validator decorators for validation and
 * Swagger decorators for API documentation.
 */
export class TaskQueryDto {
  @ApiProperty({ 
    description: 'Page number (starts from 1)', 
    example: 1, 
    required: false,
    default: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({ 
    description: 'Number of items per page', 
    example: 10, 
    required: false,
    default: 10 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 10;

  @ApiProperty({ 
    description: 'Field to sort by', 
    enum: SortField,
    example: SortField.CREATED_AT, 
    required: false,
    default: SortField.CREATED_AT 
  })
  @IsOptional()
  @IsEnum(SortField, { message: 'Invalid sort field' })
  sortBy?: SortField = SortField.CREATED_AT;

  @ApiProperty({ 
    description: 'Sort order', 
    enum: SortOrder,
    example: SortOrder.DESC, 
    required: false,
    default: SortOrder.DESC 
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'Sort order must be either "asc" or "desc"' })
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({ 
    description: 'Search term to filter tasks by name or description', 
    example: 'documentation', 
    required: false 
  })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string;
}