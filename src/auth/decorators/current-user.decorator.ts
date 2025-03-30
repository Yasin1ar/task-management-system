import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  AuthenticatedUser,
  RequestWithUser,
} from '../interfaces/auth.interfaces';

/**
 * Current User Decorator
 *
 * This decorator extracts the user from the request object.
 * It can be used in controller methods to get the authenticated user.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
