import { PrismaClient } from '@prisma/client';

async function testDatabaseConnection() {
  const prisma = new PrismaClient();

  try {
    console.log('Testing database connection...');

    // Test 1: Connect to the database
    await prisma.$connect();
    console.log('✅ Connection successful');

    // Test 2: Create a test user
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        password: 'password123',
        role: 'User',
      },
    });
    console.log('✅ User creation successful:', testUser.id);

    // Test 3: Read the user
    const foundUser = await prisma.user.findUnique({
      where: { id: testUser.id },
    });
    console.log('✅ User retrieval successful:', foundUser?.username);

    // Test 4: Update the user
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: { firstName: 'Test', lastName: 'User' },
    });
    console.log(
      '✅ User update successful:',
      updatedUser.firstName,
      updatedUser.lastName,
    );

    // Test 5: Create a task for the user
    const task = await prisma.task.create({
      data: {
        name: 'Test Task',
        description: 'This is a test task',
        userId: testUser.id,
      },
    });
    console.log('✅ Task creation successful:', task.id);

    // Test 6: Delete the task and user (cleanup)
    await prisma.task.delete({ where: { id: task.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✅ Cleanup successful');

    console.log(
      'All database tests passed! Your database is working correctly.',
    );
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
