import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Roles Decorator
 * 
 * This decorator is used to specify which roles are allowed to access a route.
 * It sets metadata that can be read by the RolesGuard.
 * 
 * @param roles The roles that are allowed to access the route
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);