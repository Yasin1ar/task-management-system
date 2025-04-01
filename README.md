# Task Management System

I am building a Task Management System using NestJS (a TypeScript-based Node.js framework) with Prisma ORM and MySQL for data management. The system will allow users to create, update, and manage tasks with features like file attachments, pagination, sorting, and filtering. It will include a secure authentication system with JWT-based authentication and role-based authorization to control access to different modules. Admin users will have the ability to manage users and assign roles, while regular users can manage their own tasks and profiles. The project will follow best practices in code structure, testing, and documentation.

## Project Plan

### 1. Project Setup (phase 1)

- [x] Set up GitHub repository with proper README
- [x] leverage gitflow
- [x] Initialize NestJS project
- [x] Include environment configuration management
- [x] Set up Docker for MySQL 8.0
- [x] Basic Prisma ORM configuration
- [x] Set up Swagger for documentation
- [x] install and configure ESLint + Prettier
- [x] install husky for pre-commit hook
- [x] Set up testing environment (Jest)
- [x] final check before the next phase

### 2. Database Design (phase 2)

- [x] Design database schema (Users, Tasks)
- [x] Create Prisma models
- [x] Set up migrations
- [x] Test database connections
- [x] final check before the next phase

### 3. Authentication Module (phase 3)

- [x] Implement user registration with validation
- [x] Implement login functionality
- [x] Set up JWT authentication
- [x] Create role-based authorization
- [x] Write tests for authentication flows
- [x] final check before the next phase

### 4. User Management Module (phase 4)

- [x] Implement admin-only user management APIs
- [x] Create user CRUD operations
- [x] Implement role assignment functionality
- [x] Add validation and error handling
- [x] Write tests for user management
- [x] final check before the next phase

### 5. User Profile Module (phase 5)

- [x] Implement profile update functionality
- [x] Add profile picture upload with file storage
- [x] Create profile retrieval endpoint
- [x] Write tests for profile management
- [x] final check before the next phase

### 6. Task Management Module (phase 6)

- [x] Implement task CRUD operations
- [x] Add file attachment functionality
- [x] Implement pagination for task listing
- [x] Add sorting and filtering (bonus)
- [x] Ensure proper user access control
- [x] Write tests for task management
- [x] final check before the next phase

### 7. Documentation & Finalization (phase 7)

- [x] Complete Swagger documentation
- [x] Finalize README with setup instructions
- [x] Review code for best practices and clean code
- [x] Ensure all tests are passing
- [x] Final testing and bug fixes
- [x] final check before the next phase
