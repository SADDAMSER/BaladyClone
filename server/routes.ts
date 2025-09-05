import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import { sql } from "drizzle-orm";
import {
  insertUserSchema, insertDepartmentSchema, insertPositionSchema,
  insertLawRegulationSchema, insertLawSectionSchema, insertLawArticleSchema,
  insertRequirementCategorySchema, insertRequirementSchema, insertServiceSchema,
  insertApplicationSchema, insertSurveyingDecisionSchema, insertTaskSchema,
  insertSystemSettingSchema, insertServiceTemplateSchema, insertDynamicFormSchema,
  insertWorkflowDefinitionSchema, insertServiceBuilderSchema
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

  app.post("/api/applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        applicantId: req.user?.id,
      });
      const application = await storage.createApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
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
      `, params));

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
      `, params));

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
        totalApplications: parseInt(stats[0].rows[0].count),
        pendingApplications: parseInt(stats[1].rows[0].count),
        approvedApplications: parseInt(stats[2].rows[0].count),
        pendingSurveys: parseInt(stats[3].rows[0].count),
        totalServices: parseInt(stats[4].rows[0].count),
      });
    } catch (error) {
      console.error("Error fetching enhanced dashboard stats:", error);
      res.status(500).json({ message: "خطأ في استرجاع الإحصائيات" });
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
