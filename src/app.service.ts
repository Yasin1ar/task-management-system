import { Injectable } from '@nestjs/common';

/**
 * Application Service
 *
 * Provides general information about the API.
 */
@Injectable()
export class AppService {
  /**
   * Returns basic information about the API
   */
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
