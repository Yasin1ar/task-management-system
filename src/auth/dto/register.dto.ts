/**
 * User Registration Data Transfer Object
 *
 * This DTO validates user registration data with the following rules:
 * - Either email or phone number must be provided (validated in service)
 * - Email must be a valid format
 * - Phone number must match the pattern +?[0-9]{10,15}
 * - Username must be at least 3 characters long
 * - Password must be at least 8 characters and contain both uppercase and lowercase letters
 * - First name and last name are optional
 *
 * The class uses class-validator decorators for validation and
 * Swagger decorators for API documentation.
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ required: false, description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, description: 'User phone number' })
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Please provide a valid phone number',
  })
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ required: true, description: 'Username for login' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string;

  @ApiProperty({ required: true, description: 'User password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])/, {
    message:
      'Password must contain at least one uppercase and one lowercase letter',
  })
  password: string;

  @ApiProperty({ required: false, description: 'User first name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ required: false, description: 'User last name' })
  @IsString()
  @IsOptional()
  lastName?: string;
}
