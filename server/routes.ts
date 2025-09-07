import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import { sql, eq, desc } from "drizzle-orm";
import { applications } from "@shared/schema";
import {
  insertUserSchema, insertDepartmentSchema, insertPositionSchema,
  insertLawRegulationSchema, insertLawSectionSchema, insertLawArticleSchema,
  insertRequirementCategorySchema, insertRequirementSchema, insertServiceSchema,
  insertApplicationSchema, insertSurveyingDecisionSchema, insertTaskSchema,
  insertSystemSettingSchema, insertServiceTemplateSchema, insertDynamicFormSchema,
  insertWorkflowDefinitionSchema, insertServiceBuilderSchema,
  insertNotificationSchema, insertApplicationStatusHistorySchema,
  insertApplicationAssignmentSchema, insertApplicationReviewSchema
} from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

// Middleware to verify JWT token
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // PUBLIC ROUTES - MUST BE FIRST (No authentication required)
  
  // Public application tracking endpoint - separate path to avoid conflicts
  app.get("/api/track-application", async (req, res) => {
    try {
      console.log('Public tracking endpoint called with:', req.query);
      const { search_term, search_by } = req.query;
      
      if (!search_term || !search_by) {
        return res.status(400).json({ error: "search_term and search_by are required" });
      }

      let application;
      
      if (search_by === 'application_number') {
        // Search by application number
        const foundApplications = await db.select()
          .from(applications)
          .where(eq(applications.applicationNumber, search_term as string))
          .limit(1);
        application = foundApplications[0];
      } else if (search_by === 'national_id') {
        // Search by national ID in application data
        const foundApplications = await db.select()
          .from(applications)
          .where(
            sql`(application_data->>'applicantId') = ${search_term as string}`
          )
          .limit(1);
        application = foundApplications[0];
      } else {
        return res.status(400).json({ error: "search_by must be 'application_number' or 'national_id'" });
      }

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Simple response without complex joins for now
      const applicationData = application.applicationData as any || {};
      
      const response = {
        id: application.id,
        applicationNumber: application.applicationNumber,
        serviceType: application.serviceId === 'service-surveying-decision' ? 'قرار المساحة' : 'خدمة حكومية',
        status: application.status,
        currentStage: application.currentStage || 'submitted',
        submittedAt: application.createdAt,
        estimatedCompletion: null, // Field not in current schema
        applicantName: applicationData.applicantName || 'غير محدد',
        applicantId: applicationData.applicantId || 'غير محدد',
        contactPhone: applicationData.contactPhone || 'غير محدد',
        email: applicationData.email,
        applicationData: {
          governorate: applicationData.governorate,
          district: applicationData.district,
          area: applicationData.area,
          landNumber: applicationData.landNumber,
          plotNumber: applicationData.plotNumber,
          surveyType: applicationData.surveyType,
          purpose: applicationData.purpose,
          description: applicationData.description
        }
      };

      console.log('Successfully found application:', response.applicationNumber);
      res.json(response);
    } catch (error) {
      console.error('Error tracking application:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create demo user for testing (only in development)
  app.post("/api/auth/create-demo-user", async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Not available in production" });
      }

      // Check if demo user already exists
      const existingUser = await storage.getUserByUsername("public_service");
      if (existingUser) {
        return res.json({ message: "Demo user already exists", user: existingUser });
      }

      // Create demo user
      const hashedPassword = await bcrypt.hash("demo123", 12);
      const demoUser = await storage.createUser({
        username: "public_service",
        email: "public.service@demo.com",
        fullName: "موظف خدمة الجمهور",
        password: hashedPassword,
        role: "public_service",
        departmentId: null,
        positionId: null,
        isActive: true
      });

      res.json({ message: "Demo user created successfully", user: demoUser });
    } catch (error) {
      console.error("Error creating demo user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management routes
  app.get("/api/users", async (req, res) => {
    try {
      const { role, departmentId, isActive } = req.query;
      const users = await storage.getUsers({
        role: role as string,
        departmentId: departmentId as string,
        isActive: isActive === 'true',
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const updates = req.body;
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 12);
      }
      const user = await storage.updateUser(req.params.id, updates);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Organizational structure routes
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/departments", authenticateToken, async (req, res) => {
    try {
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/departments/:id", authenticateToken, async (req, res) => {
    try {
      const department = await storage.getDepartment(req.params.id);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/departments/:id", authenticateToken, async (req, res) => {
    try {
      const department = await storage.updateDepartment(req.params.id, req.body);
      res.json(department);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/departments/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteDepartment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Positions routes
  app.get("/api/positions", async (req, res) => {
    try {
      const { departmentId } = req.query;
      const positions = await storage.getPositions(departmentId as string);
      res.json(positions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/positions", authenticateToken, async (req, res) => {
    try {
      const positionData = insertPositionSchema.parse(req.body);
      const position = await storage.createPosition(positionData);
      res.status(201).json(position);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legal framework routes
  app.get("/api/laws", async (req, res) => {
    try {
      const laws = await storage.getLawsRegulations();
      res.json(laws);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/laws", authenticateToken, async (req, res) => {
    try {
      const lawData = insertLawRegulationSchema.parse(req.body);
      const law = await storage.createLawRegulation(lawData);
      res.status(201).json(law);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/laws/:id", async (req, res) => {
    try {
      const law = await storage.getLawRegulation(req.params.id);
      if (!law) {
        return res.status(404).json({ message: "Law not found" });
      }
      res.json(law);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/laws/:lawId/sections", async (req, res) => {
    try {
      const sections = await storage.getLawSections(req.params.lawId);
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/laws/:lawId/sections", authenticateToken, async (req, res) => {
    try {
      const sectionData = insertLawSectionSchema.parse({
        ...req.body,
        lawId: req.params.lawId,
      });
      const section = await storage.createLawSection(sectionData);
      res.status(201).json(section);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sections/:sectionId/articles", async (req, res) => {
    try {
      const articles = await storage.getLawArticles(req.params.sectionId);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/sections/:sectionId/articles", authenticateToken, async (req, res) => {
    try {
      const articleData = insertLawArticleSchema.parse({
        ...req.body,
        sectionId: req.params.sectionId,
      });
      const article = await storage.createLawArticle(articleData);
      res.status(201).json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/search/articles", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const articles = await storage.searchLawArticles(q as string);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Technical requirements routes
  app.get("/api/requirement-categories", async (req, res) => {
    try {
      const categories = await storage.getRequirementCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/requirement-categories", authenticateToken, async (req, res) => {
    try {
      const categoryData = insertRequirementCategorySchema.parse(req.body);
      const category = await storage.createRequirementCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/requirements", async (req, res) => {
    try {
      const { categoryId } = req.query;
      const requirements = await storage.getRequirements(categoryId as string);
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/requirements", authenticateToken, async (req, res) => {
    try {
      const requirementData = insertRequirementSchema.parse(req.body);
      const requirement = await storage.createRequirement(requirementData);
      res.status(201).json(requirement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/search/requirements", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const requirements = await storage.searchRequirements(q as string);
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Services routes
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/services", authenticateToken, async (req, res) => {
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/services/:serviceId/requirements", async (req, res) => {
    try {
      const requirements = await storage.getServiceRequirements(req.params.serviceId);
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Applications routes
  app.get("/api/applications", authenticateToken, async (req, res) => {
    try {
      const { status, applicantId, assignedToId } = req.query;
      const applications = await storage.getApplications({
        status: status as string,
        applicantId: applicantId as string,
        assignedToId: assignedToId as string,
      });
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public endpoint for citizens to submit applications (no authentication required)
  app.post("/api/applications", async (req, res) => {
    try {
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        applicantId: req.body.applicantId || "anonymous", // Use provided applicantId or anonymous
      });
      const application = await storage.createApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/applications/:id", authenticateToken, async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/applications/:id", authenticateToken, async (req, res) => {
    try {
      const application = await storage.updateApplication(req.params.id, req.body);
      res.json(application);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Surveying decisions routes
  app.get("/api/surveying-decisions", authenticateToken, async (req, res) => {
    try {
      const { status, surveyorId } = req.query;
      const decisions = await storage.getSurveyingDecisions({
        status: status as string,
        surveyorId: surveyorId as string,
      });
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/surveying-decisions", authenticateToken, async (req, res) => {
    try {
      const decisionData = insertSurveyingDecisionSchema.parse(req.body);
      const decision = await storage.createSurveyingDecision(decisionData);
      res.status(201).json(decision);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/surveying-decisions/:id", authenticateToken, async (req, res) => {
    try {
      const decision = await storage.getSurveyingDecision(req.params.id);
      if (!decision) {
        return res.status(404).json({ message: "Surveying decision not found" });
      }
      res.json(decision);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/surveying-decisions/:id", authenticateToken, async (req, res) => {
    try {
      const decision = await storage.updateSurveyingDecision(req.params.id, req.body);
      res.json(decision);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", authenticateToken, async (req, res) => {
    try {
      const { assignedToId, status, applicationId } = req.query;
      const tasks = await storage.getTasks({
        assignedToId: assignedToId as string,
        status: status as string,
        applicationId: applicationId as string,
      });
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        assignedById: req.user?.id,
      });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard and statistics routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Global search route
  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const results = await storage.globalSearch(q as string);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // System settings routes
  app.get("/api/settings", authenticateToken, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/settings/:key", authenticateToken, async (req, res) => {
    try {
      const { value } = req.body;
      const setting = await storage.updateSystemSetting(req.params.key, value);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Service Automation System Routes

  // Service Templates
  app.get("/api/service-templates", async (req, res) => {
    try {
      const templates = await storage.getServiceTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/service-templates/:id", async (req, res) => {
    try {
      const template = await storage.getServiceTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/service-templates", authenticateToken, async (req, res) => {
    try {
      const data = insertServiceTemplateSchema.parse(req.body);
      const authReq = req as AuthenticatedRequest;
      const template = await storage.createServiceTemplate({
        ...data,
        createdById: authReq.user?.id
      });
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Service Builder
  app.get("/api/service-builder/:id", authenticateToken, async (req, res) => {
    try {
      const serviceBuilder = await storage.getServiceBuilder(req.params.id);
      if (!serviceBuilder) {
        return res.status(404).json({ message: "Service builder not found" });
      }
      res.json(serviceBuilder);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/service-builder", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const data = {
        builderData: req.body,
        builderId: authReq.user?.id,
        lastModifiedById: authReq.user?.id,
        publicationStatus: "draft"
      };
      
      const serviceBuilder = await storage.createServiceBuilder(data);
      res.status(201).json(serviceBuilder);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/service-builder/:id", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const updates = {
        builderData: req.body,
        lastModifiedById: authReq.user?.id
      };
      
      const serviceBuilder = await storage.updateServiceBuilder(req.params.id, updates);
      res.json(serviceBuilder);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/service-builder/:id/publish", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const serviceBuilder = await storage.publishService(req.params.id, authReq.user?.id || "");
      res.json(serviceBuilder);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dynamic Forms
  app.get("/api/forms/:serviceId", async (req, res) => {
    try {
      const form = await storage.getServiceForm(req.params.serviceId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      res.json(form);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/forms", authenticateToken, async (req, res) => {
    try {
      const data = insertDynamicFormSchema.parse(req.body);
      const form = await storage.createDynamicForm(data);
      res.status(201).json(form);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Workflow Definitions
  app.get("/api/workflows/:serviceId", async (req, res) => {
    try {
      const workflow = await storage.getServiceWorkflow(req.params.serviceId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/workflows", authenticateToken, async (req, res) => {
    try {
      const data = insertWorkflowDefinitionSchema.parse(req.body);
      const workflow = await storage.createWorkflowDefinition(data);
      res.status(201).json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Analytics and Reports
  app.get("/api/analytics/service-usage", authenticateToken, async (req, res) => {
    try {
      const analytics = await storage.getServiceUsageAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/workflow-performance", authenticateToken, async (req, res) => {
    try {
      const analytics = await storage.getWorkflowPerformanceAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // System Health and Monitoring
  app.get("/api/system/health", async (req, res) => {
    try {
      const health = await storage.getSystemHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================================================
  // Enhanced APIs for New Features
  // =========================================================

  // Service Categories
  app.get("/api/service-categories", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM service_categories 
        WHERE is_active = true 
        ORDER BY sort_order, name
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching service categories:", error);
      res.status(500).json({ message: "خطأ في استرجاع فئات الخدمات" });
    }
  });

  // Government Services
  app.get("/api/government-services", async (req, res) => {
    try {
      const { categoryId, ministryId, featured } = req.query;
      
      let whereClause = 'WHERE gs.is_active = true';
      const params: any[] = [];

      if (categoryId) {
        whereClause += ` AND gs.category_id = $${params.length + 1}`;
        params.push(categoryId);
      }
      if (ministryId) {
        whereClause += ` AND gs.ministry_id = $${params.length + 1}`;
        params.push(ministryId);
      }
      if (featured === 'true') {
        whereClause += ` AND gs.is_featured = true`;
      }

      const result = await db.execute(sql.raw(`
        SELECT 
          gs.*,
          sc.name as category_name,
          m.name as ministry_name
        FROM government_services gs
        LEFT JOIN service_categories sc ON gs.category_id = sc.id
        LEFT JOIN ministries m ON gs.ministry_id = m.id
        ${whereClause}
        ORDER BY gs.is_featured DESC, gs.name
        ${featured === 'true' ? 'LIMIT 6' : ''}
      `));

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching government services:", error);
      res.status(500).json({ message: "خطأ في استرجاع الخدمات الحكومية" });
    }
  });

  // Citizen Applications
  app.get("/api/citizen-applications", async (req, res) => {
    try {
      const { status, applicantId, serviceId, page = '1', limit = '20' } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (status) {
        whereClause += ` AND ca.status = $${params.length + 1}`;
        params.push(status);
      }
      if (applicantId) {
        whereClause += ` AND ca.applicant_id = $${params.length + 1}`;
        params.push(applicantId);
      }
      if (serviceId) {
        whereClause += ` AND ca.service_id = $${params.length + 1}`;
        params.push(serviceId);
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const result = await db.execute(sql.raw(`
        SELECT 
          ca.*,
          gs.name as service_name,
          u.full_name as applicant_name
        FROM citizen_applications ca
        LEFT JOIN government_services gs ON ca.service_id = gs.id
        LEFT JOIN users u ON ca.applicant_id = u.id
        ${whereClause}
        ORDER BY ca.submitted_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `));

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching citizen applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع الطلبات" });
    }
  });

  // Enhanced Dashboard Stats
  app.get("/api/enhanced-dashboard/stats", async (req, res) => {
    try {
      const stats = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications`),
        db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications WHERE status IN ('submitted', 'under_review')`),
        db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications WHERE status = 'approved'`),
        db.execute(sql`SELECT COUNT(*) as count FROM land_survey_requests WHERE status = 'pending'`),
        db.execute(sql`SELECT COUNT(*) as count FROM government_services WHERE is_active = true`),
      ]);

      res.json({
        totalApplications: parseInt(String(stats[0].rows[0].count)),
        pendingApplications: parseInt(String(stats[1].rows[0].count)),
        approvedApplications: parseInt(String(stats[2].rows[0].count)),
        pendingSurveys: parseInt(String(stats[3].rows[0].count)),
        totalServices: parseInt(String(stats[4].rows[0].count)),
      });
    } catch (error) {
      console.error("Error fetching enhanced dashboard stats:", error);
      res.status(500).json({ message: "خطأ في استرجاع الإحصائيات" });
    }
  });

  // Workflow Management Routes

  // Application Status History
  app.get("/api/applications/:id/status-history", authenticateToken, async (req, res) => {
    try {
      const history = await storage.getApplicationStatusHistory(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/applications/:id/status-change", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const statusData = insertApplicationStatusHistorySchema.parse({
        ...req.body,
        applicationId: req.params.id,
        changedById: req.user?.id,
      });
      const statusHistory = await storage.createApplicationStatusHistory(statusData);
      
      // Also update the main application status
      await storage.updateApplication(req.params.id, {
        status: statusData.newStatus,
        currentStage: statusData.newStage,
      });
      
      res.status(201).json(statusHistory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Application Assignments
  app.get("/api/applications/:id/assignments", authenticateToken, async (req, res) => {
    try {
      const assignments = await storage.getApplicationAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Auto-assignment endpoint (public - no authentication required for system auto-assignment)
  app.post("/api/applications/:id/auto-assign", async (req, res) => {
    try {
      const { id } = req.params;
      const application = await storage.getApplication(id);

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Simple auto-assignment logic based on service type
      const departmentAssignments = {
        'building_license': '550e8400-e29b-41d4-a716-446655440001', // Planning & Licensing Department
        'surveying_decision': '550e8400-e29b-41d4-a716-446655440002', // Surveying Department
        'demolition_permit': '550e8400-e29b-41d4-a716-446655440001', // Planning & Licensing Department
        'renovation_permit': '550e8400-e29b-41d4-a716-446655440001', // Planning & Licensing Department
        'commercial_license': '550e8400-e29b-41d4-a716-446655440003', // Commercial Affairs Department
        'industrial_license': '550e8400-e29b-41d4-a716-446655440004', // Industrial Development Department
      };

      // Extract service type from applicationData or use serviceId
      const serviceType = (application.applicationData as any)?.serviceType || 
                         (application.serviceId === 'service-surveying-decision' ? 'surveying_decision' : 'general');
      
      const targetDepartmentId = departmentAssignments[serviceType as keyof typeof departmentAssignments] || '550e8400-e29b-41d4-a716-446655440001';

      // Get available employees in the target department with the least workload
      const departmentUsers = await storage.getUsers({ departmentId: targetDepartmentId, isActive: true });
      
      if (departmentUsers.length === 0) {
        return res.status(400).json({ error: 'No available employees in target department' });
      }

      // Simple round-robin assignment to the first available employee
      const assignedToId = departmentUsers[0].id;

      // Create assignment
      const assignment = await storage.createApplicationAssignment({
        applicationId: id,
        assignedToId,
        assignedById: '00000000-0000-0000-0000-000000000000', // System auto-assignment
        assignmentType: 'primary_reviewer', // نوع التكليف
        stage: 'initial_review', // مرحلة المراجعة الأولية
        departmentId: targetDepartmentId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        priority: 'medium',
        notes: `Auto-assigned based on service type: ${serviceType}`,
        status: 'pending'
      });

      // Update application status
      await storage.updateApplication(id, {
        status: 'in_review',
        currentStage: 'review'
      });

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId: id,
        previousStatus: application.status || 'submitted',
        newStatus: 'in_review',
        changedById: '00000000-0000-0000-0000-000000000000', // System auto-assignment
        notes: 'Application auto-assigned for review'
      });

      // Create notification for assigned employee
      await storage.createNotification({
        userId: assignedToId,
        title: 'تم تعيين طلب جديد لك',
        message: `تم تعيين طلب رقم ${application.applicationNumber} لمراجعتك`,
        type: 'assignment',
        category: 'workflow',
        relatedEntityId: id,
        relatedEntityType: 'application'
      });

      res.json({ 
        assignment, 
        message: 'Application auto-assigned successfully' 
      });
    } catch (error) {
      console.error('Error auto-assigning application:', error);
      res.status(500).json({ error: 'Failed to auto-assign application' });
    }
  });

  app.post("/api/applications/:id/assign", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const assignmentData = insertApplicationAssignmentSchema.parse({
        ...req.body,
        applicationId: req.params.id,
        assignedById: req.user?.id,
      });
      const assignment = await storage.createApplicationAssignment(assignmentData);
      
      // Create notification for assigned employee
      await storage.createNotification({
        userId: assignmentData.assignedToId,
        title: 'تم تعيين طلب جديد لك',
        message: `تم تعيين طلب جديد لمراجعتك`,
        type: 'assignment',
        category: 'workflow',
        relatedEntityId: req.params.id,
        relatedEntityType: 'application'
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/assignments/:id", authenticateToken, async (req, res) => {
    try {
      const assignment = await storage.updateApplicationAssignment(req.params.id, req.body);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Payment Processing
  app.post("/api/applications/:id/payment", async (req, res) => {
    try {
      const { paymentMethod, notes, paidBy } = req.body;
      const applicationId = req.params.id;
      
      // Update application payment status
      const updatedApplication = await storage.updateApplication(applicationId, {
        isPaid: true,
        paymentDate: new Date(),
        currentStage: 'payment_confirmed',
        status: 'paid'
      });

      // Create payment record in application data
      const existingApp = await storage.getApplication(applicationId);
      if (existingApp && existingApp.applicationData) {
        const updatedData = {
          ...existingApp.applicationData,
          payment: {
            method: paymentMethod,
            notes,
            paidBy,
            paidAt: new Date().toISOString(),
            confirmedBy: 'cashier'
          }
        };
        
        await storage.updateApplication(applicationId, {
          applicationData: updatedData
        });
      }

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId,
        previousStatus: 'submitted',
        newStatus: 'paid',
        changedById: paidBy,
        notes: `Payment confirmed - ${paymentMethod}. ${notes || ''}`
      });

      // Create notification for next stage
      await storage.createNotification({
        userId: paidBy,
        title: 'تم تأكيد دفع الرسوم',
        message: `تم تأكيد دفع رسوم الطلب رقم ${existingApp?.applicationNumber}`,
        type: 'payment',
        category: 'workflow',
        relatedEntityId: applicationId,
        relatedEntityType: 'application'
      });

      res.json(updatedApplication);
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Document Review Processing
  app.post("/api/applications/:id/document-review", async (req, res) => {
    try {
      const { action, notes, reviewerId } = req.body;
      const applicationId = req.params.id;
      
      let newStatus = 'document_approved';
      let newStage = 'document_approved';
      
      if (action === 'reject') {
        newStatus = 'document_rejected';
        newStage = 'rejected';
      } else if (action === 'request_docs') {
        newStatus = 'document_review';
        newStage = 'awaiting_documents';
      }

      // Update application status
      const updatedApplication = await storage.updateApplication(applicationId, {
        status: newStatus,
        currentStage: newStage,
        reviewNotes: notes
      });

      // Get application details for notification
      const existingApp = await storage.getApplication(applicationId);

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId,
        previousStatus: 'paid',
        newStatus,
        changedById: reviewerId,
        notes: `Document review: ${action}. ${notes || ''}`
      });

      // Create notification
      let notificationMessage = '';
      if (action === 'approve') {
        notificationMessage = `تمت الموافقة على مستندات الطلب رقم ${existingApp?.applicationNumber}`;
      } else if (action === 'reject') {
        notificationMessage = `تم رفض مستندات الطلب رقم ${existingApp?.applicationNumber}`;
      } else {
        notificationMessage = `مطلوب مستندات إضافية للطلب رقم ${existingApp?.applicationNumber}`;
      }

      await storage.createNotification({
        userId: reviewerId,
        title: 'مراجعة المستندات',
        message: notificationMessage,
        type: 'document_review',
        category: 'workflow',
        relatedEntityId: applicationId,
        relatedEntityType: 'application'
      });

      res.json(updatedApplication);
    } catch (error) {
      console.error('Error processing document review:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Application Reviews
  app.get("/api/applications/:id/reviews", authenticateToken, async (req, res) => {
    try {
      const reviews = await storage.getApplicationReviews(req.params.id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/applications/:id/review", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const reviewData = insertApplicationReviewSchema.parse({
        ...req.body,
        applicationId: req.params.id,
        reviewerId: req.user?.id,
      });
      const review = await storage.createApplicationReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notifications
  app.get("/api/notifications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { isRead, category, type } = req.query;
      const notifications = await storage.getNotifications({
        userId: req.user?.id || "",
        isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
        category: category as string,
        type: type as string,
      });
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/notifications/mark-all-read", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user?.id || "");
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });


  // Employee dashboard - pending assignments
  app.get("/api/dashboard/my-assignments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const assignments = await storage.getUserAssignments(req.user?.id || "");
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Department workload statistics
  app.get("/api/dashboard/department-workload", authenticateToken, async (req, res) => {
    try {
      const { departmentId } = req.query;
      const workload = await storage.getDepartmentWorkload(departmentId as string);
      res.json(workload);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Surveyor Workflow Endpoints

  // Assignment endpoint
  app.post("/api/applications/:id/assign", async (req, res) => {
    try {
      const { assignedToId, notes, priority, assignedById } = req.body;
      const applicationId = req.params.id;

      const application = storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const updatedApplication = {
        ...application,
        status: "assigned",
        currentStage: "engineer_review",
        assignedToId,
        updatedAt: new Date().toISOString()
      };

      storage.updateApplication(applicationId, updatedApplication);

      res.json({ 
        message: "Application assigned successfully",
        application: updatedApplication
      });
    } catch (error) {
      console.error("Error assigning application:", error);
      res.status(500).json({ message: "Failed to assign application" });
    }
  });

  // Survey report submission endpoint
  app.post("/api/applications/:id/survey-report", async (req, res) => {
    try {
      const {
        surveyorId,
        findings,
        decision,
        decisionReason,
        attachments = []
      } = req.body;
      const applicationId = req.params.id;

      const application = storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Create survey report
      const surveyReport = {
        id: Date.now().toString(),
        applicationId,
        surveyorId,
        findings,
        decision,
        decisionReason,
        attachments,
        status: 'submitted',
        createdAt: new Date().toISOString()
      };

      // Update application status based on survey decision
      let newStatus = "survey_completed";
      let newStage = "completed";
      
      if (decision === 'require_modification') {
        newStatus = "requires_modification";
        newStage = "citizen_action_required";
      } else if (decision === 'reject') {
        newStatus = "rejected";
        newStage = "rejected";
      }

      const updatedApplication = {
        ...application,
        status: newStatus,
        currentStage: newStage,
        surveyReport,
        updatedAt: new Date().toISOString()
      };

      storage.updateApplication(applicationId, updatedApplication);

      res.json({
        message: "Survey report submitted successfully",
        application: updatedApplication,
        surveyReport
      });
    } catch (error) {
      console.error("Error submitting survey report:", error);
      res.status(500).json({ message: "Failed to submit survey report" });
    }
  });

  // Get survey report for application
  app.get("/api/applications/:id/survey-report", async (req, res) => {
    try {
      const applicationId = req.params.id;
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Survey report would be stored separately or in applicationData
      const applicationData = application.applicationData as any || {};
      const surveyReport = applicationData.surveyReport;

      if (!surveyReport) {
        return res.status(404).json({ message: "Survey report not found" });
      }

      res.json(surveyReport);
    } catch (error) {
      console.error("Error fetching survey report:", error);
      res.status(500).json({ message: "Failed to fetch survey report" });
    }
  });

  // Public Service Dashboard APIs
  
  // Get pending applications for public service review
  app.get("/api/public-service/pending-applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get applications that are assigned and ready for public service review
      const result = await db.select()
        .from(applications)
        .where(sql`status = 'in_review' AND current_stage = 'review'`)
        .orderBy(desc(applications.createdAt));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching pending applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع الطلبات المطلوب مراجعتها" });
    }
  });

  // Get reviewed applications by public service
  app.get("/api/public-service/reviewed-applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await db.select()
        .from(applications)
        .where(sql`status IN ('approved', 'rejected', 'pending_payment') AND current_stage != 'review'`)
        .orderBy(desc(applications.updatedAt));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching reviewed applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع الطلبات المراجعة" });
    }
  });

  // Public service review endpoint
  app.post("/api/applications/:id/public-service-review", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { decision, notes, calculatedFees, reviewerComments } = req.body;
      const applicationId = req.params.id;
      
      // Update application with review decision
      const newStatus = decision === 'approved' ? 'approved' : 'rejected';
      const newStage = decision === 'approved' ? 'pending_payment' : 'rejected';
      
      await storage.updateApplication(applicationId, {
        status: newStatus,
        currentStage: newStage,
        fees: calculatedFees.toString()
      });

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId,
        previousStatus: 'in_review',
        newStatus,
        previousStage: 'review',
        newStage,
        changedById: req.user?.id || '',
        notes: `خدمة الجمهور - ${decision === 'approved' ? 'اعتماد' : 'رفض'}: ${reviewerComments}`
      });

      // Create notification
      await storage.createNotification({
        userId: req.user?.id || '',
        title: decision === 'approved' ? 'تم اعتماد الطلب' : 'تم رفض الطلب',
        message: `تم ${decision === 'approved' ? 'اعتماد' : 'رفض'} الطلب من قبل خدمة الجمهور`,
        type: 'review',
        category: 'workflow',
        relatedEntityId: applicationId,
        relatedEntityType: 'application'
      });

      res.json({
        message: `تم ${decision === 'approved' ? 'اعتماد' : 'رفض'} الطلب بنجاح`,
        applicationId,
        decision,
        calculatedFees
      });
    } catch (error) {
      console.error("Error processing public service review:", error);
      res.status(500).json({ message: "خطأ في معالجة المراجعة" });
    }
  });

  // Treasury and Payment APIs
  
  // Generate invoice for approved application
  app.post("/api/applications/:id/generate-invoice", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const applicationId = req.params.id;
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }

      if (application.status !== 'approved') {
        return res.status(400).json({ message: "يمكن إصدار الفاتورة للطلبات المعتمدة فقط" });
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      const issueDate = new Date();
      const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now

      // Update application with payment status
      await storage.updateApplication(applicationId, {
        status: 'pending_payment',
        currentStage: 'payment'
      });

      const invoiceData = {
        invoiceNumber,
        applicationId,
        applicationNumber: application.applicationNumber,
        applicantName: application.applicantName,
        applicantId: application.applicantId,
        contactPhone: application.contactPhone,
        serviceType: application.serviceType,
        fees: application.fees,
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: 'pending'
      };

      res.json({
        message: "تم إنشاء الفاتورة بنجاح",
        invoice: invoiceData
      });
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ message: "خطأ في إنشاء الفاتورة" });
    }
  });

  // Get invoice details
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoiceId = req.params.id;
      
      // Mock invoice data - في التطبيق الحقيقي سيتم جلب البيانات من قاعدة البيانات
      const mockInvoice = {
        id: invoiceId,
        invoiceNumber: 'INV-711220912',
        applicationNumber: 'APP-2025-297204542',
        applicantName: 'صدام حسين حسين السراجي',
        applicantId: '778774772',
        contactPhone: '777123456',
        serviceType: 'إصدار تقرير مساحي',
        fees: {
          basicFee: 55000,
          additionalFee: 2000,
          total: 57000
        },
        issueDate: '2025-03-31',
        dueDate: '2025-04-15',
        status: 'pending'
      };

      res.json(mockInvoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "خطأ في استرجاع الفاتورة" });
    }
  });

  // Confirm payment
  app.post("/api/payments/confirm", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, paymentMethod, notes, amount } = req.body;
      
      if (!applicationId) {
        return res.status(400).json({ message: "معرف الطلب مطلوب" });
      }

      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }

      // Update application status to awaiting assignment after payment
      await storage.updateApplication(applicationId, {
        status: 'paid',
        currentStage: 'awaiting_assignment',
        paymentStatus: 'paid',
        paymentDate: new Date().toISOString()
      });

      // Create payment record (this would be stored in a payments table in real implementation)
      const paymentRecord = {
        id: `PAY-${Date.now()}`,
        applicationId,
        amount: amount || application.fees,
        paymentMethod: paymentMethod || 'cash',
        notes: notes || 'تم السداد في الصندوق',
        paymentDate: new Date().toISOString(),
        cashierId: req.user?.id
      };

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId,
        previousStatus: 'pending_payment',
        newStatus: 'paid',
        previousStage: 'payment',
        newStage: 'awaiting_assignment',
        changedById: req.user?.id || '',
        notes: `تم تأكيد السداد - ${paymentMethod || 'نقدي'}. في انتظار تكليف مهندس`
      });

      res.json({
        message: "تم تأكيد السداد بنجاح",
        payment: paymentRecord
      });
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "خطأ في تأكيد السداد" });
    }
  });

  // Get treasury statistics
  // Treasury applications - Applications ready for payment
  app.get("/api/treasury-applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get applications that are approved and pending payment
      const applications = await storage.getApplications({
        status: 'pending_payment'
      });

      // Transform applications to include payment-related fields
      const treasuryApplications = applications.map(app => {
        const fees = app.fees || 57000; // Default fee if not set
        
        return {
          ...app,
          fees: fees.toString(),
          invoiceNumber: app.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
          paymentStatus: app.status === 'paid' ? 'paid' : 'pending',
          invoiceDate: app.updatedAt || app.submittedAt,
          dueDate: new Date(Date.now() + (15 * 24 * 60 * 60 * 1000)).toISOString(), // 15 days from now
          applicationData: {
            ...app.applicationData,
            area: app.applicationData?.area || '700'
          }
        };
      });

      res.json(treasuryApplications);
    } catch (error) {
      console.error("Error fetching treasury applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع طلبات الصندوق" });
    }
  });

  // Department manager applications - Applications awaiting assignment after payment
  app.get("/api/manager-applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get applications that are paid and awaiting assignment
      const applications = await storage.getApplications({
        status: 'paid',
        currentStage: 'awaiting_assignment'
      });

      res.json(applications);
    } catch (error) {
      console.error("Error fetching manager applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع طلبات المدير" });
    }
  });

  // Assign engineer to application
  app.post('/api/applications/:id/assign', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { assignedToId, notes, priority } = req.body;
      const applicationId = req.params.id;

      // Update application assignment
      await storage.updateApplication(applicationId, {
        assignedToId,
        status: 'assigned',
        currentStage: 'field_survey'
      });

      // Create a task for the assigned engineer
      const taskData = {
        title: 'مسح ميداني للطلب',
        description: 'إجراء مسح ميداني وإعداد التقرير المطلوب',
        applicationId,
        assignedToId,
        assignedById: req.user?.id,
        priority: priority || 'medium',
        status: 'pending',
        notes: notes
      };
      
      await storage.createTask(taskData);

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId,
        previousStatus: 'paid',
        newStatus: 'assigned',
        previousStage: 'awaiting_assignment',
        newStage: 'field_survey',
        changedById: req.user?.id || '',
        notes: `تم تكليف مهندس: ${notes || ''}`
      });

      res.json({ success: true, message: "تم تكليف المهندس بنجاح" });
    } catch (error) {
      console.error('Error assigning application:', error);
      res.status(500).json({ message: 'خطأ في تكليف المهندس' });
    }
  });

  app.get("/api/treasury/stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Mock statistics - في التطبيق الحقيقي سيتم حساب الإحصائيات من قاعدة البيانات
      const mockStats = {
        totalRevenue: 187000,
        pendingPayments: 2,
        paidToday: 1,
        overduePayments: 1,
        totalTransactions: 1,
        revenueToday: 45000
      };

      res.json(mockStats);
    } catch (error) {
      console.error("Error fetching treasury stats:", error);
      res.status(500).json({ message: "خطأ في استرجاع إحصائيات الصندوق" });
    }
  });

  // Get payment notifications for treasury
  app.get("/api/treasury/notifications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Mock notifications for new payments
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'new_payment',
          title: 'طلب جديد في انتظار السداد',
          message: 'طلب APP-2025-297204542 معتمد ومجهز للسداد',
          applicationId: 'treasury-1',
          createdAt: new Date().toISOString(),
          isRead: false
        }
      ];

      res.json(mockNotifications);
    } catch (error) {
      console.error("Error fetching treasury notifications:", error);
      res.status(500).json({ message: "خطأ في استرجاع الإشعارات" });
    }
  });

  // Ministries
  app.get("/api/ministries", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM ministries 
        WHERE is_active = true 
        ORDER BY name
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching ministries:", error);
      res.status(500).json({ message: "خطأ في استرجاع الوزارات" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
