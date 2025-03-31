import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Update Profile DTO
 *
 * This DTO validates profile update data with the following rules:
 * - Email must be a valid format (optional)
 * - Phone number must match the pattern +?[0-9]{10,15} (optional)
 * - First name and last name are optional strings
 * - Username cannot be updated (handled in service)
 *
 * The class uses class-validator decorators for validation and
 * Swagger decorators for API documentation.
 */
export class UpdateProfileDto {
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

  @ApiProperty({ required: false, description: 'User first name' })
  @IsString()
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  @IsOptional()
  firstName?: string;

  @ApiProperty({ required: false, description: 'User last name' })
  @IsString()
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  @IsOptional()
  lastName?: string;
}