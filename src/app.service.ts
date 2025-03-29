import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      name: 'Task Management API',
      version: '1.0.0',
      description: 'API for managing tasks and users',
      endpoints: {
        auth: '/auth',
        users: '/users',
        tasks: '/tasks',
      },
    };
  }
}
