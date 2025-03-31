import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

/**
 * Authentication Service
 *
 * Handles user authentication operations including:
 * - User registration with validation
 * - User login and credential verification
 * - Password hashing using bcrypt
 * - JWT token generation for authenticated users
 *
 * The service ensures that users provide either an email or phone number,
 * validates that usernames, emails, and phone numbers are unique,
 * and securely stores user passwords using bcrypt hashing.
 */

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if registerDto is defined
    if (!registerDto) {
      throw new BadRequestException('Request body is required');
    }

    const { email, phoneNumber, username, password } = registerDto;

    // Validate required fields
    if (!username) {
      throw new BadRequestException('Username is required');
    }

    if (!password) {
      throw new BadRequestException('Password is required');
    }

    // Validate that at least one of email or phoneNumber is provided
    if (!email && !phoneNumber) {
      throw new BadRequestException(
        'Either email or phone number must be provided',
      );
    }

    try {
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
          email,
          phoneNumber,
          username,
          password: hashedPassword,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        },
      });

      // Return user data and token
      return this.buildUserResponse(user);
    } catch (error) {
      // Handle Prisma unique constraint errors
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target.includes('email')) {
            throw new BadRequestException('Email already in use');
          }
          if (target.includes('username')) {
            throw new BadRequestException('Username already in use');
          }
          if (target.includes('phoneNumber')) {
            throw new BadRequestException('Phone number already in use');
          }
        }
      }
      
      // If it's already a BadRequestException, just rethrow it
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // For any other errors, log and throw a generic error
      console.error('Error during user registration:', error);
      throw new InternalServerErrorException('An error occurred during registration');
    }
  }

  async login(loginDto: LoginDto) {
    // Check if loginDto is defined
    if (!loginDto) {
      throw new BadRequestException('Request body is required');
    }

    const { username, password } = loginDto;

    // Validate required fields
    if (!username) {
      throw new BadRequestException('Username is required');
    }

    if (!password) {
      throw new BadRequestException('Password is required');
    }

    // Find user by username
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    // If user doesn't exist or password doesn't match, throw an error
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return user data and token
    return this.buildUserResponse(user);
  }

  /**
   * Builds a standardized user response object
   *
   * @param user The user entity from the database
   * @returns An object containing user data (without password) and JWT token
   */
  private buildUserResponse(user: User) {
    // Generate JWT token
    const token = this.generateToken(user);

    // Use object destructuring to exclude the password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  private generateToken(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
