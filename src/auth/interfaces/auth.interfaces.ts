/**
 * Auth-related interfaces
 *
 * This file contains interfaces used across the authentication module.
 */
import { User, UserRole } from '@prisma/client';

/**
 * Represents an authenticated user without the password field
 */
export type AuthenticatedUser = Omit<User, 'password'>;

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: number;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Extended Request interface that includes the user property
 */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
