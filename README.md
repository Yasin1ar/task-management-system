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
- [ ] final check before the next phase

### 2. Database Design (phase 2)

- [ ] Design database schema (Users, Tasks, Roles)
- [ ] Create Prisma models
- [ ] Set up migrations
- [ ] Test database connections
- [ ] final check before the next phase

### 3. Authentication Module (phase 3)

- [ ] Implement user registration with validation
- [ ] Implement login functionality
- [ ] Set up JWT authentication
- [ ] Create role-based authorization
- [ ] Write tests for authentication flows
- [ ] final check before the next phase

### 4. User Management Module (phase 4)

- [ ] Implement admin-only user management APIs
- [ ] Create user CRUD operations
- [ ] Implement role assignment functionality
- [ ] Add validation and error handling
- [ ] Write tests for user management
- [ ] final check before the next phase

### 5. User Profile Module (phase 5)

- [ ] Implement profile update functionality
- [ ] Add profile picture upload with file storage
- [ ] Create profile retrieval endpoint
- [ ] Write tests for profile management
- [ ] final check before the next phase

### 6. Task Management Module (phase 6)

- [ ] Implement task CRUD operations
- [ ] Add file attachment functionality
- [ ] Implement pagination for task listing
- [ ] Add sorting and filtering (bonus)
- [ ] Ensure proper user access control
- [ ] Write tests for task management
- [ ] final check before the next phase

### 7. Documentation & Finalization (phase 7)

- [ ] Complete Swagger documentation
- [ ] Finalize README with setup instructions
- [ ] Review code for best practices and clean code
- [ ] Ensure all tests are passing
- [ ] Final testing and bug fixes
- [ ] final check before the next phase
