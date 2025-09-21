# Overview

This is a comprehensive digital platform for the Yemeni construction and municipal services sector, called "منصة بناء اليمن" (Yemen Construction Platform). The application provides a complete digital transformation solution for construction permits, surveying decisions, technical requirements compliance, and legal framework automation. It serves as a centralized hub for citizens, investors, engineers, and government employees to manage all construction-related services digitally.

The platform is designed to handle multiple complex workflows including building license issuance, surveying decision processing, technical requirements validation, legal compliance checking, organizational structure management, and task coordination across different departments.

# الحالة الراهنة للمشروع (Current Status)

حتى تاريخ اليوم، تم بنجاح تطوير وتنفيذ الإصدار الأول من منصة بناء اليمن كتطبيق متخصص يعمل كإثبات للمفهوم (Proof of Concept) للرؤية الشاملة. هذا الإصدار يركز على أتمتة خدمات رئيسية مثل إصدار القرارات المساحية ورخص البناء، ويحتوي على بنية تحتية قوية تمثل الأساس المتين الذي ستبنى عليه المنصة الشاملة لاحقًا.

## الوظائف المُنجزة والعاملة

### 1. خدمات المواطنين الأساسية ✅
- **تقديم طلبات رخص البناء**: نظام كامل لتقديم ومتابعة طلبات رخص البناء مع واجهة سهلة الاستخدام
- **تقديم طلبات القرارات المساحية**: نموذج شامل لطلب القرارات المساحية مع البيانات الجغرافية المطلوبة
- **دفع الرسوم الإلكترونية**: نظام دفع متكامل مع إدارة الفواتير وتأكيد المدفوعات
- **متابعة حالة الطلبات**: لوحة تحكم للمواطنين لمتابعة جميع طلباتهم والحصول على التحديثات

### 2. أنظمة إدارة الموظفين ✅
- **لوحة مراجع الخدمات العامة**: لمراجعة وإعداد الطلبات للمرحلة التالية
- **لوحة الخزينة**: لإدارة المدفوعات وتأكيد الدفعات المالية
- **لوحة مدير القسم**: لتكليف المهندسين والمساحين للطلبات المدفوعة
- **لوحة مساعد المدير**: لجدولة المواعيد وإدارة المهام المكلفة
- **لوحة المهندس المساح**: لإدخال تقارير المسح الميداني والبيانات التقنية

### 3. البنية التحتية التقنية ✅
- **قاعدة بيانات شاملة**: نموذج بيانات متطور يغطي جميع جوانب العمل البلدي والإنشائي
- **نظام المصادقة والصلاحيات**: نظام أمان متعدد المستويات (مواطنين، موظفين، مدراء، إداريين)
- **واجهة برمجة التطبيقات RESTful**: API موثقة ومنظمة لجميع العمليات
- **واجهة مستخدم متجاوبة**: تصميم يدعم اللغة العربية (RTL) ويعمل على جميع الأجهزة

### 4. سير العمل المُؤتمت ✅
- **سلسلة الموافقات**: تدفق آلي للطلبات عبر الإدارات المختلفة
- **نظام التكليفات**: تعيين المهندسين والمساحين تلقائياً حسب العبء والتخصص
- **إدارة المواعيد**: جدولة المواعيد الميدانية والمتابعة
- **التنبيهات والإشعارات**: نظام تنبيهات في الوقت الفعلي لجميع الأطراف

## التقنيات المستخدمة والمطبقة

### Frontend (واجهة المستخدم)
- React 18 + TypeScript للتطوير الآمن والحديث
- shadcn/ui + Tailwind CSS لتصميم متسق ومتجاوب
- TanStack Query لإدارة البيانات والتخزين المؤقت
- دعم كامل للغة العربية والاتجاه RTL

### Backend (الخادم الخلفي)
- Node.js + Express + TypeScript للأداء والأمان
- Drizzle ORM + PostgreSQL للبيانات
- JWT للمصادقة وbcrypt للتشفير
- RESTful API مع التعامل المنسق للأخطاء

### النشر والتطوير
- Vite للتطوير السريع والبناء المحسّن
- Git للتحكم في الإصدارات
- بيئة متكاملة على Replit للتطوير التعاوني

## المستوى الحالي للإنجاز

**إثبات المفهوم مكتمل بنسبة 90%** - جميع الوظائف الأساسية تعمل بكفاءة، مع قاعدة بيانات شاملة تضم النظام الهرمي الجغرافي الكامل ونظام مصادقة محكم. النظام قادر على التعامل مع الطلبات من التقديم حتى الإنجاز النهائي عبر جميع الإدارات، مع دعم كامل للبنية الجغرافية الهرمية (6 مستويات من المحافظات حتى قطع الأراضي).

**الإنجازات الجديدة**:
- ✅ النظام الهرمي الجغرافي مكتمل: governorates → districts → sub_districts → neighborhoods → harat → neighborhood_units → blocks → plots
- ✅ شبكة الشوارع: streets → street_segments مع geometric data
- ✅ جميع APIs تعمل: 6 كيانات جغرافية جديدة مع hierarchical filtering
- ✅ البنية التحتية جاهزة لـ LBAC (Location-Based Access Control)

**Phase 3 مكتمل** (تاريخ: 16 سبتمبر 2025):
- ✅ **Pagination Support**: دعم التصفح للواجهات الخلفية مع 20 performance index
- ✅ **Enhanced Endpoints**: APIs محسنة مع RBAC/LBAC وvalidation شامل
- ✅ **Security Hardening**: تطبيق معايير الأمان الصارمة مع role-based constraints
- ✅ **Integration Testing**: اختبارات شاملة مع assertion system وCI/CD readiness

**Phase 4 مكتمل جزئياً** (تاريخ: 18 سبتمبر 2025):
- ✅ **Mobile Data Contracts**: تعريف 7 نماذج محمولة شاملة في shared/schema.ts
- ✅ **Security Hardening**: token hashing وdevice registration آمن
- ✅ **Drizzle Index Optimization**: إصلاح index builders وpartial unique constraints  
- ✅ **GeoJSON Integration**: دعم كامل للWGS84 معيار coordinate system
- ✅ **Sync Infrastructure**: idempotency keys وtombstones للmobile delta sync
- ✅ **Relations & Schemas**: type-safe Drizzle relations وZod validation schemas

**Phase 5 مكتمل** (تاريخ: 21 سبتمبر 2025):
- ✅ **PostGIS Spatial Integration**: تفعيل PostGIS الكامل مع GiST spatial indexing
- ✅ **Spatial Relationship Engine**: تطوير نظام متطور للعلاقات المكانية مع 3 مستويات احتياطية
- ✅ **Perfect Neighborhood Units Linkage**: تحقيق نسبة 100% في ربط وحدات الجوار (1196/1196) 
- ✅ **Revolutionary Data Quality**: التحسن من 816 وحدة (68%) إلى 1196 وحدة (100%)
- ✅ **PostGIS Spatial Functions**: استخدام ST_Intersects، ST_Area، ST_Contains، ST_Distance للربط الدقيق
- ✅ **Geographic Data Validation**: نظام شامل للتحقق من سلامة البيانات الجغرافية مع الإصلاح التلقائي
- ✅ **Three-Tier Fallback Strategy**: Primary intersection → Centroid containment → Nearest distance
- ✅ **Zero Failures Achievement**: تحقيق معدل فشل 0% مع إحصائيات مفصلة للأداء

**الإنجاز الرئيسي**: **تحول جذري من النهج القائم على الأعمدة إلى العلاقات المكانية الحقيقية**، مما حقق قفزة نوعية من معدل نجاح 68% إلى 100% في ربط وحدات الجوار بالقطاعات، وإضافة 380 وحدة جوار جديدة للنظام.

**المرحلة التالية**: Mobile API specification design وauthentication endpoints.

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