/**
 * Auth-related interfaces
 *
 * This file contains interfaces used across the authentication module.
 */
import { UserRole } from '@prisma/client';
import { Request } from 'express';

/**
 * Represents an authenticated user in the system
 * This interface is used for the user object attached to requests
 * after successful authentication
 */
export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  profilePicture: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: number; // User ID
  username: string;
  role: UserRole;
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
}

/**
 * Response returned after successful authentication
 */
export interface AuthResponse {
  user: AuthenticatedUser;
  token: string;
}

/**
 * Extended Request interface that includes the user property
 */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
