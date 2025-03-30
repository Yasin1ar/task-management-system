/**
 * Update User DTO
 *
 * This DTO is used by admins to update existing users.
 * All fields are optional since updates can be partial.
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
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

  @ApiProperty({ required: false, description: 'User password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])/, {
    message:
      'Password must contain at least one uppercase and one lowercase letter',
  })
  @IsOptional()
  password?: string;

  @ApiProperty({ required: false, description: 'User first name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ required: false, description: 'User last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    required: false,
    description: 'User role',
    enum: UserRole,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
