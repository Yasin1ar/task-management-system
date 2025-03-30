/**
 * Create User DTO
 *
 * This DTO contains all fields needed for user creation with comprehensive validation.
 * It's used by admins to create new users.
 */
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @ApiProperty({
    description: 'User email address',
    required: false,
    example: 'user@example.com',
  })
  email?: string;

  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Please provide a valid phone number' })
  @ApiProperty({
    description: 'User phone number',
    required: false,
    example: '+1234567890',
  })
  phoneNumber?: string;

  @IsNotEmpty({ message: 'Username is required' })
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username cannot exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  @ApiProperty({
    description: 'Unique username',
    required: true,
    example: 'johndoe',
  })
  username: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])/, {
    message: 'Password must contain both uppercase and lowercase letters',
  })
  @ApiProperty({
    description: 'User password (min 8 chars, must include uppercase and lowercase)',
    required: true,
    example: 'Password123',
  })
  password: string;

  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  @ApiProperty({
    description: 'User first name',
    required: false,
    example: 'John',
  })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  @ApiProperty({
    description: 'User last name',
    required: false,
    example: 'Doe',
  })
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be a valid user role' })
  @ApiProperty({
    enum: UserRole,
    description: 'User role',
    required: false,
    default: UserRole.User,
    example: 'User',
  })
  role?: UserRole = UserRole.User;
}
