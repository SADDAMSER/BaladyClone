# Overview

This project, "منصة بناء اليمن" (Yemen Construction Platform), is a digital platform aimed at transforming the Yemeni construction and municipal services sector. Its primary purpose is to centralize and automate construction-related services, including permits, surveying decisions, technical compliance, and legal frameworks. The platform serves citizens, investors, engineers, and government entities by providing a comprehensive digital hub for managing building licenses, geospatial data, and inter-departmental workflows.

**NEW: Geographic Data Processing System** - The platform now includes a complete GeoTIFF processing microservice architecture with production-ready Python workers, enabling automated raster data analysis and tile generation for construction planning and surveying workflows. The long-term vision is to achieve complete digital transformation for the sector, enhancing efficiency, transparency, and accessibility of services.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

**September 21, 2025 - Geographic Data Processing System Complete**:
- ✅ Implemented complete GeoTIFF processing pipeline with Node.js API + Python worker architecture
- ✅ Added geo_jobs and geo_job_events database tables with PostgreSQL queue management
- ✅ Integrated Object Storage for file management with signed URLs and security validation
- ✅ Created production-ready Python worker with database polling, heartbeat mechanism, and modular processing
- ✅ Successfully tested end-to-end workflow: authentication → job creation → file upload → processing
- ✅ Confirmed RBAC security enforcement and API endpoint functionality
- ✅ Achieved 100% system integration with existing PoC GeoTIFF processor

# System Architecture

## UI/UX Decisions
The platform features a responsive UI designed with shadcn/ui components, built on Radix UI primitives, and styled with Tailwind CSS. It fully supports Arabic (RTL) language with custom CSS variables for theming, using Noto Sans Arabic and Cairo fonts.

## Technical Implementations
- **Frontend**: Developed with React 18 and TypeScript, utilizing Wouter for routing and TanStack Query for state management and caching. Vite is used for fast development and optimized builds.
- **Backend**: Built on Node.js with Express.js and TypeScript. It provides RESTful API endpoints with consistent error handling.
- **Database**: PostgreSQL is the primary database, managed with Drizzle ORM for type-safe operations. It includes a comprehensive schema covering user management, organizational structure, legal frameworks, technical requirements, application workflows, geospatial data (integrated with PostGIS for spatial relationships and indexing), and task management.
- **Authentication & Authorization**: JWT-based authentication with bcrypt for password hashing. Role-based access control (RBAC) and Location-Based Access Control (LBAC) manage permissions across multiple user roles (Citizens, Employees, Managers, Administrators).
- **Internationalization**: Primary language is Arabic, with a full RTL-first design.

## Feature Specifications
The platform automates key services like building license issuance and surveying decision processing. It includes:
- Citizen services for application submission, payment, and status tracking.
- Employee management dashboards for service review, treasury operations, task assignment, and field reporting.
- Automated workflow for approvals, task assignments, and real-time notifications.
- A robust geographical hierarchical system (governorates to plots) and street network data with geometric properties.
- Advanced spatial processing for blocks and neighborhood units, achieving high accuracy in data linkage.

## System Design Choices
The architecture emphasizes full-stack type safety using TypeScript and efficient data handling with Drizzle ORM. The system is designed for scalability and security, with comprehensive validation, error handling, and robust security measures including token hashing and secure device registration. It supports mobile data contracts and delta synchronization for offline capabilities. The spatial data infrastructure leverages PostGIS with GiST spatial indexing for efficient geospatial queries and relationships, including a three-tier fallback strategy for accurate data linkage.

# External Dependencies

## Database Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle Kit**: For database schema migrations.

## UI Component Libraries
- **Radix UI**: Unstyled, accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

## Development & Build Tools
- **Vite**: Modern build tool with React plugin and Cartographer plugin for Replit integration.
- **TypeScript**: For type safety.
- **PostCSS**: CSS processing.

## Authentication & Security
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT token generation and verification.
- **Connect PG Simple**: PostgreSQL session store for Express.

## Form Management
- **React Hook Form**: Performant form library.
- **Hookform Resolvers**: Integration with validation libraries.
- **Zod**: TypeScript-first schema validation.

## Development Dependencies
- **ESBuild**: Fast JavaScript bundler.
- **tsx**: TypeScript execution for Node.js.
- **ws**: For WebSocket support.