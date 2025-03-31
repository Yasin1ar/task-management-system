// Load environment variables from .env.test
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Force the DATABASE_URL to use the test database
process.env.DATABASE_URL = process.env.DATABASE_URL || "mysql://root:root@localhost:3306/task_db_test";

console.log('Environment setup for tests completed');
console.log(`Using database: ${process.env.DATABASE_URL}`);