/**
 * Auth Service Unit Tests
 * 
 * This test suite validates the functionality of the AuthService, focusing on:
 * - User registration with proper validation
 * - Error handling for missing required fields (email/phone)
 * - Duplicate detection for email, phone number, and username
 * - Password hashing and JWT token generation
 * 
 * The tests use mocked PrismaService and JwtService to isolate the AuthService
 * functionality and ensure that database operations and token generation
 * are properly handled without external dependencies.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    
    jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed-password'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 1,
        email: registerDto.email,
        phoneNumber: null,
        username: registerDto.username,
        password: 'hashed-password',
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        profilePicture: null,
        role: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).toBe('test-token');
    });

    it('should throw an error if neither email nor phone number is provided', async () => {
      const invalidDto = { ...registerDto, email: undefined };
      
      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw an error if email is already in use', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        email: registerDto.email,
        username: 'different-username',
        phoneNumber: null,
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already in use');
    });

    it('should throw an error if username is already in use', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        email: 'different@example.com',
        username: registerDto.username,
        phoneNumber: null,
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Username already in use');
    });
  });
});
