## Profile Module

The Profile Module allows users to manage their profile information and upload profile pictures.

### Features

- **Profile Retrieval**: Users can view their profile information
- **Profile Update**: Users can update their profile details (except username)
- **Profile Picture Upload**: Users can upload and update their profile picture
- **Profile Picture Retrieval**: Users can view their profile picture

### Endpoints

- `GET /profile` - Get the current user's profile
- `PATCH /profile` - Update the current user's profile
- `PATCH /profile/picture` - Upload or update profile picture
- `GET /profile/picture/:id` - Get a user's profile picture (only accessible to the profile owner)

### Setup

The Profile Module requires the following setup:

1. Ensure the uploads directory exists:
   ```bash
   mkdir -p uploads/profiles
   ```

2. Install required dependencies:
   ```bash
   npm install @nestjs/platform-express @nestjs/serve-static multer uuid
   npm install -D @types/multer @types/uuid
   ```

3. Make sure the uploads directory is served statically:
   ```typescript
   // In app.module.ts
   import { ServeStaticModule } from '@nestjs/serve-static';
   import { join } from 'path';

   @Module({
     imports: [
       // ...
       ServeStaticModule.forRoot({
         rootPath: join(__dirname, '..', 'uploads'),
         serveRoot: '/uploads',
       }),
       // ...
     ],
   })
   ```