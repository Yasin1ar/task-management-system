/**
 * User Query DTO
 *
 * This DTO is used for querying users with pagination and filtering options.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class UserQueryDto {
  @ApiProperty({
    required: false,
    description: 'Page number (starts from 1)',
    default: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Number of items per page',
    default: 10,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ required: false, description: 'Search by username' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false, description: 'Search by email' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by role',
    enum: UserRole,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
