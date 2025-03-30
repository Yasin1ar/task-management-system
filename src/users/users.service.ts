/**
 * Users Service
 *
 * This service handles all user management operations:
 * - Creating users
 * - Retrieving users (single or paginated list)
 * - Updating users
 * - Deleting users
 *
 * Only admin users should have access to these operations.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import * as bcrypt from 'bcrypt';
import { Prisma, User, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user (admin only)
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const { email, phoneNumber, username, password } = createUserDto;

    // Validate that at least one of email or phoneNumber is provided
    if (!email && !phoneNumber) {
      throw new BadRequestException(
        'Either email or phone number must be provided',
      );
    }

    // Check for existing user with the same email, phone number, or username
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: email || null },
          { phoneNumber: phoneNumber || null },
          { username },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new BadRequestException('Email already in use');
      }
      if (existingUser.phoneNumber === phoneNumber) {
        throw new BadRequestException('Phone number already in use');
      }
      if (existingUser.username === username) {
        throw new BadRequestException('Username already in use');
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    // Remove password from the returned user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get all users with pagination and filtering
   */
  async findAll(query: UserQueryDto) {
    const { page = 1, limit = 10, username, email, role } = query;
    const skip = (page - 1) * limit;

    // Build the where clause based on provided filters
    const where = {
      ...(username && { username: { contains: username } }),
      ...(email && { email: { contains: email } }),
      ...(role && { role }),
    };

    // Get users with pagination
    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Exclude password
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get total count for pagination metadata
    const total = await this.prisma.user.count({ where });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single user by ID
   */
  async findOne(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove password from the returned user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update a user by ID
   */
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check for duplicate email, phone number, or username
    if (
      updateUserDto.email ||
      updateUserDto.phoneNumber ||
      updateUserDto.username
    ) {
      // Build the OR conditions for the query
      const orConditions: Prisma.UserWhereInput[] = [];

      if (updateUserDto.email) {
        orConditions.push({ email: updateUserDto.email });
      }

      if (updateUserDto.phoneNumber) {
        orConditions.push({ phoneNumber: updateUserDto.phoneNumber });
      }

      if (updateUserDto.username) {
        orConditions.push({ username: updateUserDto.username });
      }

      if (orConditions.length > 0) {
        const duplicateUser = await this.prisma.user.findFirst({
          where: {
            OR: orConditions,
            NOT: { id },
          },
        });

        if (duplicateUser) {
          // Check which field caused the duplicate
          if (
            updateUserDto.email &&
            duplicateUser.email === updateUserDto.email
          ) {
            throw new BadRequestException('Email already in use');
          }
          if (
            updateUserDto.phoneNumber &&
            duplicateUser.phoneNumber === updateUserDto.phoneNumber
          ) {
            throw new BadRequestException('Phone number already in use');
          }
          if (
            updateUserDto.username &&
            duplicateUser.username === updateUserDto.username
          ) {
            throw new BadRequestException('Username already in use');
          }
        }
      }
    }

    // Prepare update data
    const updateData = { ...updateUserDto } as Partial<User>;

    // Hash password if provided
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Update the user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Remove password from the returned user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Update a user's role
   */
  async updateRole(id: number, role: UserRole): Promise<Omit<User, 'password'>> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Invalid role. Must be Admin or User');
    }

    // Update the user's role
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role },
    });

    // Remove password from the returned user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Delete a user by ID
   * This will also delete all tasks associated with the user due to the cascade delete in the schema
   */
  async remove(id: number): Promise<void> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Delete the user (and their tasks due to cascade delete)
    await this.prisma.user.delete({
      where: { id },
    });
  }
}
