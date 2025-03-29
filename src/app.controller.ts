import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

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
}
