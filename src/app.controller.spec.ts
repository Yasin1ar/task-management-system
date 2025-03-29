/**
 * App Controller Tests
 * 
 * This test suite validates the functionality of the AppController:
 * - Getting API information
 * - Redirecting to API documentation
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      // Arrange
      const expectedResult = 'Hello World!';
      jest.spyOn(appService, 'getHello').mockImplementation(() => expectedResult);
      
      // Act
      const result = appController.getHello();
      
      // Assert
      expect(result).toBe(expectedResult);
      expect(appService.getHello).toHaveBeenCalled();
    });
  });

  describe('getApiInfo', () => {
    it('should return API information from the service', () => {
      // Arrange
      const expectedResult = {
        name: 'Task Management API',
        version: '1.0.0',
        description: 'API for managing tasks and users',
        endpoints: {
          auth: '/auth',
          users: '/users',
          tasks: '/tasks',
        },
      };
      jest.spyOn(appService, 'getApiInfo').mockImplementation(() => expectedResult);

      // Act
      const result = appController.getApiInfo();

      // Assert
      expect(result).toBe(expectedResult);
      expect(appService.getApiInfo).toHaveBeenCalled();
    });
  });

  describe('getDocs', () => {
    it('should return undefined (for redirect)', () => {
      // The redirect is handled by the @Redirect decorator
      // We just need to ensure the method returns undefined
      const result = appController.getDocs();
      expect(result).toBeUndefined();
    });

    it('should have the correct redirect decorator', () => {
      // This is a more advanced test that checks the metadata
      // created by the @Redirect decorator
      const metadata = Reflect.getMetadata('redirect', appController.getDocs);
      expect(metadata).toBeDefined();
      expect(metadata.url).toBe('api/docs');
      expect(metadata.statusCode).toBe(302);
    });
  });
});
