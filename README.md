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

- Node.js (v16+)
- Docker and Docker Compose
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

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
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
│   ├── profiles/            # Profile pictures
│   └── attachments/         # Task attachments
└── scripts/                 # Utility scripts
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
