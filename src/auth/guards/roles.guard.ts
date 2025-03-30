import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RequestWithUser } from '../interfaces/auth.interfaces';

/**
 * Roles Guard
 *
 * This guard is used to protect routes based on user roles.
 * It checks if the authenticated user has the required role to access the route.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the roles required for the route
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get the user from the request
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // If no user is present in the request, deny access
    if (!request.user) {
      return false;
    }

    // Check if the user has the required role
    return requiredRoles.some((role) => request.user.role === role);
  }
}
