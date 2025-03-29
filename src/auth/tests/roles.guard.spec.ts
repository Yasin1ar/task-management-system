/**
 * Roles Guard Tests
 * 
 * This test suite validates the roles guard functionality:
 * - Allows access when no roles are required
 * - Allows access when the user has the required role
 * - Denies access when the user doesn't have the required role
 */
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from '../guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow access when no roles are required', () => {
    const context = createMockExecutionContext({ role: UserRole.User });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has the required role', () => {
    const context = createMockExecutionContext({ role: UserRole.Admin });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.Admin]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user does not have the required role', () => {
    const context = createMockExecutionContext({ role: UserRole.User });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.Admin]);

    expect(guard.canActivate(context)).toBe(false);
  });

  // Helper function to create a mock execution context
  function createMockExecutionContext(user: any): ExecutionContext {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    return mockContext;
  }
});