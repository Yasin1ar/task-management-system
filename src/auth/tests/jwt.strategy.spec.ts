/**
 * JWT Strategy Tests
 *
 * This test suite validates the JWT strategy functionality:
 * - Successfully validates a token and returns the user
 * - Throws an error when the user is not found
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user without password when user exists', async () => {
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

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const payload = { sub: 1, username: 'testuser', role: 'User' };
      const result = await strategy.validate(payload);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('username', 'testuser');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const payload = { sub: 999, username: 'nonexistent', role: 'User' };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'User not found',
      );
    });
  });
});
