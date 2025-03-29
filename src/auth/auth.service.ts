/**
 * Authentication Service
 * 
 * Handles user authentication operations including:
 * - User registration with validation
 * - Password hashing using bcrypt
 * - JWT token generation for authenticated users
 * - Validation of user credentials
 * 
 * The service ensures that users provide either an email or phone number,
 * validates that usernames, emails, and phone numbers are unique,
 * and securely stores user passwords using bcrypt hashing.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, phoneNumber, username, password } = registerDto;

    // Validate that at least one of email or phoneNumber is provided
    if (!email && !phoneNumber) {
      throw new BadRequestException('Either email or phone number must be provided');
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
        email,
        phoneNumber,
        username,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      },
    });

    // Generate JWT token
    const token = this.generateToken(user);

    // Return user data (excluding password) and token
    const { password: _, ...result } = user;
    return {
      user: result,
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
