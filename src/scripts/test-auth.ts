/**
 * Authentication Flow Test Script
 * 
 * This script tests the complete authentication flow of the API:
 * 1. User registration with dynamic credentials
 * 2. User login with the newly created credentials
 * 3. Access to a protected route using the JWT token
 * 4. Cleanup of test data from the database
 * 
 * The script uses axios for HTTP requests and provides detailed console output
 * for each step of the process, including success responses and error handling.
 * 
 * Usage:
 *   npx ts-node src/scripts/test-auth.ts
 * 
 * Prerequisites:
 *   - The API server must be running on localhost:3000
 *   - The database must be accessible
 *   - The protected route '/protected' must be implemented
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client for database operations
const prisma = new PrismaClient();

// Base URL for the API - change this if your API runs on a different host/port
const API_URL = 'http://localhost:3000';

/**
 * Main function to test the authentication flow
 */
async function testAuth() {
  let testUserId: number | null = null;
  let testUsername: string | null = null;

  try {
    // Generate unique identifiers for this test run
    const timestamp = Date.now();
    testUsername = `testuser_${timestamp}`;
    const testEmail = `test_${timestamp}@example.com`;

    // Step 1: Register a new user with unique credentials
    console.log('Registering a new user...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      username: testUsername,
      password: 'Password123', // Strong password that meets validation requirements
      email: testEmail,
    });
    console.log('Registration successful:', registerResponse.data);
    
    // Store the user ID for cleanup
    testUserId = registerResponse.data.user.id;
    
    // Extract username and token from the registration response
    const { username } = registerResponse.data.user;
    const token = registerResponse.data.token;
    
    // Step 2: Login with the newly created user credentials
    console.log('\nLogging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username, // Use the username from the registration response
      password: 'Password123',
    });
    console.log('Login successful:', loginResponse.data);
    
    // Step 3: Access a protected route using the JWT token
    console.log('\nAccessing protected route...');
    const protectedResponse = await axios.get(`${API_URL}/protected`, {
      headers: {
        Authorization: `Bearer ${token}`, // Add the JWT token to the Authorization header
      },
    });
    console.log('Protected route access successful:', protectedResponse.data);
    
  } catch (error) {
    // Comprehensive error handling
    console.error('Error:', error.response?.data || error.message);
    
    // Show additional details about where the error occurred
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Endpoint: ${error.config.method.toUpperCase()} ${error.config.url}`);
    }
  } finally {
    // Step 4: Cleanup - remove the test user from the database
    if (testUserId) {
      try {
        console.log(`\nCleaning up: Removing test user ${testUsername} (ID: ${testUserId})...`);
        await prisma.user.delete({
          where: { id: testUserId },
        });
        console.log('Cleanup successful: Test user removed from database');
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError.message);
      } finally {
        // Disconnect from the database
        await prisma.$disconnect();
      }
    } else {
      console.log('\nNo cleanup needed: No test user was created');
      await prisma.$disconnect();
    }
  }
}

// Execute the test function
testAuth();
