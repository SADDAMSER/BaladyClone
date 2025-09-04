# Overview

This is a comprehensive digital platform for the Yemeni construction and municipal services sector, called "منصة بناء اليمن" (Yemen Construction Platform). The application provides a complete digital transformation solution for construction permits, surveying decisions, technical requirements compliance, and legal framework automation. It serves as a centralized hub for citizens, investors, engineers, and government employees to manage all construction-related services digitally.

The platform is designed to handle multiple complex workflows including building license issuance, surveying decision processing, technical requirements validation, legal compliance checking, organizational structure management, and task coordination across different departments.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with custom CSS variables for theming and RTL (right-to-left) support for Arabic
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **API Design**: RESTful API endpoints with consistent error handling

## Database Design
- **Primary Database**: PostgreSQL with comprehensive schema covering:
  - User management and authentication
  - Organizational structure (departments, positions, hierarchies)
  - Legal framework (laws, regulations, sections, articles)
  - Technical requirements and compliance categories
  - Application workflows and status tracking
  - Surveying decisions and geospatial data
  - Task management and assignment system
- **Schema Pattern**: Relational design with proper foreign key relationships and UUID primary keys
- **Data Integrity**: Comprehensive constraints and validation rules

## Authentication & Authorization
- **Authentication**: JWT tokens with secure session management
- **Authorization**: Role-based access control (RBAC) with multiple user roles:
  - Citizens (basic service access)
  - Employees (departmental operations)
  - Managers (supervisory functions)
  - Administrators (system-wide access)
- **Security**: Password hashing with bcrypt, secure token storage, and HTTPS enforcement

## Internationalization
- **Primary Language**: Arabic with RTL layout support
- **Fonts**: Noto Sans Arabic and Cairo fonts for proper Arabic text rendering
- **Layout**: RTL-first design with proper spacing and alignment

## Development Environment
- **Development Server**: Vite dev server with HMR (Hot Module Replacement)
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Build Process**: Separate frontend and backend build processes with optimized production outputs

# External Dependencies

## Database Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting via @neondatabase/serverless
- **Connection Pooling**: Built-in connection management for scalable database access
- **Migration System**: Drizzle Kit for database schema migrations and management

## UI Component Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives including:
  - Form controls (dialogs, dropdowns, selects)
  - Navigation components (menus, tabs, accordions)
  - Data display (tables, cards, badges)
  - Feedback components (toasts, alerts, progress)
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Lucide React**: Modern icon library for consistent iconography

## Development & Build Tools
- **Vite**: Modern build tool with plugin ecosystem including:
  - React plugin for JSX transformation
  - Runtime error overlay for development
  - Cartographer plugin for Replit integration
- **TypeScript**: Full-stack type safety with shared types between frontend and backend
- **PostCSS**: CSS processing with Tailwind CSS integration

## Authentication & Security
- **bcrypt**: Industry-standard password hashing
- **jsonwebtoken**: JWT token generation and verification
- **Connect PG Simple**: PostgreSQL session store for Express sessions

## Form Management
- **React Hook Form**: Performant form library with minimal re-renders
- **Hookform Resolvers**: Integration with validation libraries
- **Zod**: TypeScript-first schema validation for runtime type checking

## Development Dependencies
- **ESBuild**: Fast JavaScript bundler for backend builds
- **tsx**: TypeScript execution for Node.js development
- **WebSocket Support**: Real-time communication capabilities via ws library