
import { Controller, Get, UseGuards, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { AuthenticatedUser } from './auth/interfaces/auth.interfaces';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get API information' })
  getApiInfo() {
    return this.appService.getApiInfo();
  }

  @Get('docs')
  @ApiOperation({ summary: 'Redirect to API documentation' })
  @Redirect('api/docs', 302)
  getDocs() {
    // This method doesn't need a body as the @Redirect decorator
    // handles the redirection
    return;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiBearerAuth()
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  }
}
