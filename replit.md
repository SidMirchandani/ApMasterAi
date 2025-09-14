# APMaster.ai - AI-Powered AP Test Preparation Platform

## Overview

APMaster.ai is an AI-powered web application designed to help students prepare for AP exams. The platform provides realistic practice tests, personalized AI tutoring, progress tracking, and community features. The application is built as a full-stack web application with a React frontend and Express.js backend, currently in development for a beta launch in January 2026.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server components:

- **Frontend**: React-based single-page application using TypeScript
- **Backend**: Express.js REST API with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: Shadcn/ui components with Tailwind CSS
- **Build System**: Vite for frontend bundling and development
- **Deployment**: Optimized for Replit hosting

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: Radix UI primitives with Shadcn/ui component library
- **Styling**: Tailwind CSS with custom color palette (coral, peach, sage, teal, navy)
- **Forms**: React Hook Form with Zod validation

### Backend Architecture  
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with structured error handling
- **Middleware**: Custom logging, JSON parsing, CORS handling
- **Development**: Vite integration for hot reloading in development

### Data Storage
- **Database**: PostgreSQL with enhanced reliability and connection management
- **Connection Pool**: Optimized for Replit with automatic reconnection and health monitoring
- **ORM**: Drizzle ORM for type-safe database operations with retry mechanisms
- **Schema**: Centralized in `shared/schema.ts` for type sharing
- **Current Tables**:
  - `users`: User authentication and profiles with Firebase UID mapping
  - `waitlist_emails`: Email collection for beta signup with uniqueness constraints
  - `user_subjects`: Subject enrollment and mastery tracking
- **Storage Pattern**: Interface-based storage layer with comprehensive error handling
- **Reliability Features**:
  - Automatic database reconnection on connection failures
  - Health monitoring with 30-second check intervals
  - Retry mechanisms with exponential backoff for all operations
  - Cross-domain connection persistence for Replit environments
  - Enhanced error handling with connection-specific recovery

### Authentication & Authorization
- **Firebase Authentication**: Cross-domain auth with Replit-specific reliability fixes
- **Enhanced Auth Persistence**: Automatic auth state restoration across browser contexts
- **Domain-Aware Configuration**: Handles Replit preview domains and new tab scenarios
- **Session Management**: Firebase-based with automatic token refresh and error recovery
- **Waitlist Functionality**: Email collection for beta signup with duplicate prevention

## Data Flow

1. **Client Requests**: React components make API calls using React Query
2. **API Layer**: Express routes handle requests with validation
3. **Business Logic**: Storage interface abstracts database operations
4. **Database**: Drizzle ORM manages PostgreSQL interactions
5. **Response**: Structured JSON responses with error handling
6. **Client Updates**: React Query manages cache invalidation and UI updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm & drizzle-kit**: Database ORM and migration tools
- **@tanstack/react-query**: Server state management
- **react-hook-form & @hookform/resolvers**: Form handling
- **zod**: Schema validation and type safety

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **@replit/vite-plugin-***: Replit-specific development tools

## Deployment Strategy

### Development Environment
- **Platform**: Replit with custom Vite configuration
- **Hot Reloading**: Vite middleware integrated with Express
- **Database**: PostgreSQL instance via environment variables
- **Scripts**: `npm run dev` for development with tsx

### Production Deployment
- **Build Process**: Vite builds frontend, esbuild bundles backend
- **Output**: Static frontend assets and bundled server
- **Database**: PostgreSQL with Drizzle migrations
- **Environment**: Node.js production environment
- **Scripts**: `npm run build` then `npm start`

### Database Management
- **Migrations**: Drizzle Kit manages schema changes
- **Environment**: DATABASE_URL environment variable required
- **Schema**: Shared types between client and server
- **Commands**: `npm run db:push` for schema updates

The application is designed to be scalable and maintainable, with clear separation of concerns and modern development practices. The current focus is on building the core waitlist functionality before expanding to full AP test preparation features.