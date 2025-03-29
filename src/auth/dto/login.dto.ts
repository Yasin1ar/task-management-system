/**
 * User Login Data Transfer Object
 *
 * This DTO validates user login data with the following rules:
 * - Username is required and must be a string
 * - Password is required and must be a string
 *
 * The class uses class-validator decorators for validation and
 * Swagger decorators for API documentation.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ required: true, description: 'Username for login' })
  @IsString()
  username: string;

  @ApiProperty({ required: true, description: 'User password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
