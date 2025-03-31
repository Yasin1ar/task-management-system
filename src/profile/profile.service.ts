import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Profile Service
 *
 * This service handles user profile operations:
 * - Retrieving user profile information
 * - Updating profile details
 * - Managing profile pictures
 */
@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get a user's profile
   * @param userId The ID of the authenticated user
   * @returns The user's profile without the password
   */
  async getProfile(userId: number): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password from the returned user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update a user's profile
   * @param userId The ID of the authenticated user
   * @param updateProfileDto The data to update
   * @returns The updated user profile without the password
   */
  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<Omit<User, 'password'>> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check for duplicate email or phone number
    if (updateProfileDto.email || updateProfileDto.phoneNumber) {
      const duplicateCheck = await this.checkForDuplicates(
        userId,
        updateProfileDto,
      );
      if (duplicateCheck) {
        throw new BadRequestException(duplicateCheck);
      }
    }

    // Update the user profile
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
    });

    // Remove password from the returned user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Update a user's profile picture
   * @param userId The ID of the authenticated user
   * @param file The uploaded profile picture file
   * @returns The updated user profile without the password
   */
  async updateProfilePicture(
    userId: number,
    file: Express.Multer.File,
  ): Promise<Omit<User, 'password'>> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Delete old profile picture if it exists
    if (existingUser.profilePicture) {
      try {
        const oldPicturePath = path.join(
          process.cwd(),
          existingUser.profilePicture,
        );
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
        }
      } catch (error) {
        console.error('Error deleting old profile picture:', error);
        // Continue even if deletion fails
      }
    }

    // Update the user with the new profile picture path
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profilePicture: file.path,
      },
    });

    // Remove password from the returned user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Get a user's profile picture
   * @param userId The ID of the user
   * @param requestingUserId The ID of the authenticated user making the request
   * @returns The path to the profile picture
   */
  async getProfilePicture(
    userId: number,
    requestingUserId: number,
  ): Promise<string> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if the requesting user is the same as the profile owner
    if (userId !== requestingUserId) {
      throw new UnauthorizedException(
        'You can only access your own profile picture',
      );
    }

    // Check if profile picture exists
    if (!user.profilePicture) {
      throw new NotFoundException('Profile picture not found');
    }

    return user.profilePicture;
  }

  /**
   * Check for duplicate email or phone number
   * @param userId The ID of the user being updated
   * @param updateProfileDto The data to check for duplicates
   * @returns An error message if duplicates are found, null otherwise
   */
  private async checkForDuplicates(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<string | null> {
    const { email, phoneNumber } = updateProfileDto;

    if (email) {
      const duplicateEmail = await this.prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (duplicateEmail) {
        return 'Email already in use';
      }
    }

    if (phoneNumber) {
      const duplicatePhone = await this.prisma.user.findFirst({
        where: {
          phoneNumber,
          NOT: { id: userId },
        },
      });

      if (duplicatePhone) {
        return 'Phone number already in use';
      }
    }

    return null;
  }
}