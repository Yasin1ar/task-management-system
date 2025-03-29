import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * JWT payload interface
 */
interface JwtPayload {
  sub: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Strategy for authentication
 *
 * This strategy validates JWT tokens and loads the user entity
 * based on the user ID stored in the token payload.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  async validate(payload: JwtPayload) {
    // Find the user by ID from the JWT payload
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    // If user doesn't exist, throw an exception
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Use object rest parameter to exclude the password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }
}
