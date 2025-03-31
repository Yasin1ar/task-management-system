import * as dotenv from 'dotenv';
// Load .env.test file first
dotenv.config({ path: '.env.test' });
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';

// Define a specific test database URL - this ensures we don't use the main database
const TEST_DATABASE_URL = "mysql://root:root@localhost:3306/task_db_test";

// Create a new PrismaClient instance that will use the TEST_DATABASE_URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
});

// Log which database we're using to verify
console.log(`Using test database: ${TEST_DATABASE_URL}`);

/**
 * Setup function to prepare the database for testing
 */
export async function setupTestDatabase() {
  try {
    console.log('Setting up test database...');

    // Verify we're using the test database
    const dbResult = await prisma.$queryRaw`SELECT DATABASE() as db`;
    const dbName = (dbResult as any)[0].db;
    console.log('Current database:', dbName);
    
    // Fail if we're not using a test database
    if (!dbName.includes('test')) {
      throw new Error('Tests are running against the production database! Aborting.');
    }

    // Push the schema to the test database
    try {
      console.log('Pushing Prisma schema to test database...');
      execSync('npx prisma db push', {
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        stdio: 'inherit'
      });
      console.log('Schema push completed');
    } catch (error) {
      console.error('Error pushing schema:', error);
    }

    // Reset the database to a clean state
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0;`;
    
    // Truncate all tables - use the correct table names based on your schema
    try {
      await prisma.$executeRaw`TRUNCATE TABLE users;`;
      await prisma.$executeRaw`TRUNCATE TABLE tasks;`;
    } catch (error) {
      console.log('Tables may not exist yet, continuing...');
    }
    
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1;`;

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
 * Get the Prisma client instance
 */
export function getPrismaClient() {
  return prisma;
}

/**
 * Create a test admin user for testing admin-only endpoints
 */
export async function createTestAdmin() {
  // Use bcrypt for password hashing, consistent with your auth service
  const hashedPassword = await bcrypt.hash('AdminPassword123', 10);
  
  return prisma.user.create({
    data: {
      username: `admin-${Date.now()}`, // Make username unique with timestamp
      email: `admin-${Date.now()}@test.com`, // Make email unique with timestamp
      password: hashedPassword,
      role: UserRole.Admin,
    },
  });
}

/**
 * Create a test regular user
 */
export async function createTestUser() {
  const hashedPassword = await bcrypt.hash('UserPassword123', 10);
  
  return prisma.user.create({
    data: {
      username: `user-${Date.now()}`, // Make username unique with timestamp
      email: `user-${Date.now()}@test.com`, // Make email unique with timestamp
      password: hashedPassword,
      role: UserRole.User,
    },
  });
}
