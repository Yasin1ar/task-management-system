/**
 * User Query DTO
 *
 * This DTO is used for querying users with pagination and filtering options.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class UserQueryDto {
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @ApiProperty({
    description: 'Filter by username (partial match)',
    required: false,
    example: 'john',
  })
  username?: string;

  @IsOptional()
  @IsString({ message: 'Email must be a string' })
  @ApiProperty({
    description: 'Filter by email (partial match)',
    required: false,
    example: 'john@example.com',
  })
  email?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be either Admin or User' })
  @ApiProperty({
    enum: UserRole,
    description: 'Filter by user role',
    required: false,
    example: 'User',
  })
  role?: UserRole;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @ApiProperty({
    description: 'Page number (starts from 1)',
    required: false,
    default: 1,
    minimum: 1,
    example: 1,
  })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @IsPositive({ message: 'Limit must be a positive number' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  limit?: number = 10;
}
