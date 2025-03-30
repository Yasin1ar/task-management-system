/**
 * E2E Test Setup
 * 
 * This file handles the setup and teardown of the test database for E2E tests.
 * It ensures each test runs with a clean database state.
 */
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment variables from .env.test if it exists
dotenv.config({ path: '.env.test' });

const prisma = new PrismaClient();

/**
 * Setup function to prepare the database for testing
 */
export async function setupTestDatabase() {
  try {
    // Reset the database to a clean state
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users;');
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('Test database reset completed');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

/**
 * Teardown function to clean up after tests
 */
export async function teardownTestDatabase() {
  await prisma.$disconnect();
}

/**
 * Create a test admin user for testing admin-only endpoints
 */
export async function createTestAdmin() {
  const hashedPassword = await prisma.$executeRaw`SELECT SHA2('AdminPassword123', 256) as hash`;
  
  return prisma.user.create({
    data: {
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'hashed-password', // In a real scenario, use bcrypt
      role: 'Admin'
    }
  });
}