/**
 * Create User DTO
 *
 * This DTO extends RegisterDto and adds admin-specific fields.
 * It's used by admins to create new users.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';
import { RegisterDto } from '../../auth/dto/register.dto';

export class CreateUserDto extends RegisterDto {
  @ApiProperty({
    required: false,
    description: 'User role',
    enum: UserRole,
    default: UserRole.User,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.User;
}
