import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 *
 * This guard is used to protect routes that require authentication.
 * It verifies that a valid JWT token is present in the request.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
