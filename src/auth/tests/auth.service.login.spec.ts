/**
 * Auth Service Login Tests
 *
 * This test suite validates the login functionality of the AuthService:
 * - Successful login with valid credentials
 * - Error handling for non-existent users
 * - Error handling for invalid passwords
 * - JWT token generation
 *
 * The tests use mocked PrismaService and JwtService to isolate the AuthService
 * functionality and ensure that database operations and token generation
 * are properly handled without external dependencies.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';

describe('AuthService - Login', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
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

    // Mock bcrypt.compare to return true only for 'correctPassword'
    jest.spyOn(bcrypt, 'compare').mockImplementation((password) => {
      return await Promise.resolve(password === 'correctPassword');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: 'correctPassword',
    };

    const mockUser = {
      id: 1,
      email: 'test@example.com',
      phoneNumber: null,
      username: 'testuser',
      password: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      profilePicture: null,
      role: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should login a user successfully with valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: loginDto.username },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).toBe('test-token');
    });

    it('should throw an error if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw an error if password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const invalidLoginDto = { ...loginDto, password: 'wrongPassword' };

      await expect(service.login(invalidLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(invalidLoginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });
});
