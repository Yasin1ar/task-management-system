# Task Management System

A robust back-end system for managing tasks built with NestJS, MySQL, and Prisma ORM.

## Overview

This Task Management System provides a complete solution for user authentication, profile management, task management, and user administration. The system follows best practices for security, code organization, and API design.

## Features

### Authentication

- User registration with email, phone number, or username
- Secure password validation (8+ characters with uppercase and lowercase)
- JWT-based authentication
- Role-based access control

### User Management (Admin only)

- List all users with pagination, sorting, and filtering
- Modify user data
- Delete users (cascades to their tasks)
- Assign roles (Admin or User)

### User Profile

- Update profile information
- Upload profile pictures
- View profile details

### Task Management

- Create, read, update, and delete tasks
- File attachments for tasks
- Pagination, sorting, and filtering for task lists
- User-specific task access control

## Tech Stack

- **Framework**: NestJS
- **Database**: MySQL 8.0 (Docker)
- **ORM**: Prisma
- **Authentication**: JWT
- **Documentation**: Swagger
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier, Husky

## Getting Started

### Prerequisites

- Node.js (v20+)
- Docker(optional, for mysql)
- Git

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yasin1ar/task-management-system.git
   cd task-management-system
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration.

4. Start the MySQL database in docker container:

   ```bash
   docker run --name mysql_db -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=task_db -p 3306:3306 -d mysql:8.0

   ```

   Note: -e MYSQL_ROOT_PASSWORD= -e MYSQL_DATABASE= must be in coordinate with DATABASE_URL defined in `.env`.

5. Run database migrations:

   ```bash
   npx prisma migrate dev
   ```

6. Start the application:

   ```bash
   npm run start:dev
   ```

## Running Tests

### Setup

1. **Create the test database**

   First, create a test database in MySQL:

   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS task_db_test;"
   ```

   Then, push the Prisma schema to the test database:

   ```bash
   npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss
   ```

2. **Verify the test environment**

   Check that the `.env.test` file exists in the root directory and contains:

   ```
   DATABASE_URL="mysql://root:root@localhost:3306/task_db_test"
   JWT_SECRET="test_secret_key"
   PORT=3001
   ```

   Adjust the database connection string as needed for your environment.

### Running Tests

Run the E2E tests with:

```bash
npm run test:e2e
```

To run a specific test file:

```bash
npm run test:e2e -- users.e2e-spec.ts
```

To run tests in watch mode:

```bash
npm run test:e2e:watch
```

### Troubleshooting

If tests are still using the main database:

1. Check that the `.env.test` file is correctly configured
2. Verify that the `DATABASE_URL` in `.env.test` points to the test database
3. Check the console output for which database is being used - it should show "Using test database: mysql://root:root@localhost:3306/task_db_test"
4. Make sure you're using the `npm run test:e2e` command which sets `NODE_ENV=test`

### How It Works

The E2E tests use a separate database configuration to ensure they don't affect your development or production data. This is achieved through:

1. A separate `.env.test` file with test-specific environment variables
2. The `jest-env-setup.ts` file that loads these variables before tests run
3. The `test-database.ts` file that creates a Prisma client specifically for the test database
4. A safety check that verifies we're using a test database before running tests

### Also Unit test

```bash
# Unit tests
npm run test
```

## API Documentation

Once the application is running, you can access the Swagger documentation at:

```
http://localhost:3000/api/docs
```

### Main API Endpoints

#### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token

#### User Management (Admin only)

- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `PATCH /users/:id/role` - Update user role

#### User Profile

- `GET /profile` - Get current user profile
- `PATCH /profile` - Update profile
- `POST /profile/upload` - Upload profile picture

#### Task Management

- `GET /tasks` - Get all tasks for current user
- `POST /tasks` - Create a new task
- `GET /tasks/:id` - Get task by ID
- `PATCH /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `POST /tasks/:id/attachment` - Upload task attachment
- `GET /tasks/:id/attachment` - Download task attachment

## Project Structure

```
.
├── prisma/                  # Prisma schema and migrations
├── src/
│   ├── auth/                # Authentication module
│   ├── users/               # User management module
│   ├── profile/             # User profile module
│   ├── tasks/               # Task management module
│   ├── prisma/              # Prisma service
│   ├── app.module.ts        # Main application module
│   └── main.ts              # Application entry point
├── test/                    # E2E tests
├── uploads/                 # Uploaded files storage
    ├── profiles/            # Profile pictures
    └── attachments/         # Task attachments

```

## Development Guidelines

### Git Workflow

This project follows the Gitflow workflow:

- `main` branch contains production code
- `develop` branch is the integration branch
- Feature branches are created from `develop`
- Use pull requests for code reviews

### Coding Standards

- Follow NestJS best practices
- Use TypeScript features appropriately
- Write unit and integration tests for new features
- Document APIs with Swagger annotations
- Format code with Prettier before committing

## License

This project is licensed under the MIT License - see the LICENSE file for details.
