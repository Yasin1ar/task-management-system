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
  @Redirect('api/docs', 302)
  @ApiOperation({ summary: 'Redirect to API documentation' })
  getDocs() {
    return;
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Protected route example' })
  getProtected(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'This is a protected route',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  }
}
