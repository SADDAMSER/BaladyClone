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
  insertSystemSettingSchema, insertGovernorateSchema, insertDistrictSchema,
  insertSubDistrictSchema, insertNeighborhoodSchema, insertHaratSchema,
  insertSectorSchema, insertNeighborhoodUnitSchema, insertBlockSchema,
  insertPlotSchema, insertStreetSchema, insertStreetSegmentSchema,
  insertServiceTemplateSchema, insertDynamicFormSchema,
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

  // Governorates endpoints (Geographic data - public access for read operations)
  app.get("/api/governorates", async (req, res) => {
    try {
      const governorates = await storage.getGovernorates();
      res.json(governorates);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/governorates/:id", async (req, res) => {
    try {
      const governorate = await storage.getGovernorate(req.params.id);
      if (!governorate) {
        return res.status(404).json({ message: "Governorate not found" });
      }
      res.json(governorate);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/governorates/code/:code", async (req, res) => {
    try {
      const governorate = await storage.getGovernorateByCode(req.params.code);
      if (!governorate) {
        return res.status(404).json({ message: "Governorate not found" });
      }
      res.json(governorate);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/governorates", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertGovernorateSchema.parse(req.body);
      const governorate = await storage.createGovernorate(validatedData);
      res.status(201).json(governorate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/governorates/:id", authenticateToken, async (req, res) => {
    try {
      const governorate = await storage.updateGovernorate(req.params.id, req.body);
      res.json(governorate);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/governorates/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteGovernorate(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Districts endpoints (Geographic data - public access for read operations)
  app.get("/api/districts", async (req, res) => {
    try {
      const { governorateId } = req.query;
      const districts = await storage.getDistricts(governorateId as string);
      res.json(districts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/districts/:id", async (req, res) => {
    try {
      const district = await storage.getDistrict(req.params.id);
      if (!district) {
        return res.status(404).json({ message: "District not found" });
      }
      res.json(district);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/districts/code/:code", async (req, res) => {
    try {
      const district = await storage.getDistrictByCode(req.params.code);
      if (!district) {
        return res.status(404).json({ message: "District not found" });
      }
      res.json(district);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/governorates/:id/districts", async (req, res) => {
    try {
      const districts = await storage.getDistrictsByGovernorateId(req.params.id);
      res.json(districts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/districts", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertDistrictSchema.parse(req.body);
      const district = await storage.createDistrict(validatedData);
      res.status(201).json(district);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/districts/:id", authenticateToken, async (req, res) => {
    try {
      const district = await storage.updateDistrict(req.params.id, req.body);
      res.json(district);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/districts/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteDistrict(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sub-districts endpoints (Geographic data - public access for read operations)
  app.get("/api/sub-districts", async (req, res) => {
    try {
      const { districtId } = req.query;
      const subDistricts = await storage.getSubDistricts(districtId as string);
      res.json(subDistricts);
    } catch (error: any) {
      console.error('sub-districts failed', { impl: storage.constructor.name, err: error.message, stack: error.stack });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sub-districts/:id", async (req, res) => {
    try {
      const subDistrict = await storage.getSubDistrict(req.params.id);
      if (!subDistrict) {
        return res.status(404).json({ message: "Sub-district not found" });
      }
      res.json(subDistrict);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/districts/:id/sub-districts", async (req, res) => {
    try {
      const subDistricts = await storage.getSubDistrictsByDistrictId(req.params.id);
      res.json(subDistricts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/sub-districts", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertSubDistrictSchema.parse(req.body);
      const subDistrict = await storage.createSubDistrict(validatedData);
      res.status(201).json(subDistrict);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/sub-districts/:id", authenticateToken, async (req, res) => {
    try {
      const subDistrict = await storage.updateSubDistrict(req.params.id, req.body);
      res.json(subDistrict);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/sub-districts/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteSubDistrict(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Neighborhoods endpoints (Geographic data - public access for read operations)
  app.get("/api/neighborhoods", async (req, res) => {
    try {
      const { subDistrictId } = req.query;
      const neighborhoods = await storage.getNeighborhoods(subDistrictId as string);
      res.json(neighborhoods);
    } catch (error: any) {
      console.error('neighborhoods failed', { impl: storage.constructor.name, err: error.message, stack: error.stack });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/neighborhoods/:id", async (req, res) => {
    try {
      const neighborhood = await storage.getNeighborhood(req.params.id);
      if (!neighborhood) {
        return res.status(404).json({ message: "Neighborhood not found" });
      }
      res.json(neighborhood);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sub-districts/:id/neighborhoods", async (req, res) => {
    try {
      const neighborhoods = await storage.getNeighborhoodsBySubDistrictId(req.params.id);
      res.json(neighborhoods);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/neighborhoods", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertNeighborhoodSchema.parse(req.body);
      const neighborhood = await storage.createNeighborhood(validatedData);
      res.status(201).json(neighborhood);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/neighborhoods/:id", authenticateToken, async (req, res) => {
    try {
      const neighborhood = await storage.updateNeighborhood(req.params.id, req.body);
      res.json(neighborhood);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/neighborhoods/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteNeighborhood(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Harat endpoints (Geographic data - public access for read operations)
  app.get("/api/harat", async (req, res) => {
    try {
      const { neighborhoodId } = req.query;
      const harat = await storage.getHarat(neighborhoodId as string);
      res.json(harat);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/harat/:id", async (req, res) => {
    try {
      const harat = await storage.getHaratById(req.params.id);
      if (!harat) {
        return res.status(404).json({ message: "Harat not found" });
      }
      res.json(harat);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/neighborhoods/:id/harat", async (req, res) => {
    try {
      const harat = await storage.getHaratByNeighborhoodId(req.params.id);
      res.json(harat);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/harat", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertHaratSchema.parse(req.body);
      const harat = await storage.createHarat(validatedData);
      res.status(201).json(harat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/harat/:id", authenticateToken, async (req, res) => {
    try {
      const harat = await storage.updateHarat(req.params.id, req.body);
      res.json(harat);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/harat/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteHarat(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sectors endpoints (Geographic data - public access for read operations)
  app.get("/api/sectors", async (req, res) => {
    try {
      const { governorateId } = req.query;
      const sectors = await storage.getSectors(governorateId as string);
      res.json(sectors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sectors/:id", async (req, res) => {
    try {
      const sector = await storage.getSector(req.params.id);
      if (!sector) {
        return res.status(404).json({ message: "Sector not found" });
      }
      res.json(sector);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/governorates/:id/sectors", async (req, res) => {
    try {
      const sectors = await storage.getSectorsByGovernorateId(req.params.id);
      res.json(sectors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/sectors", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertSectorSchema.parse(req.body);
      const sector = await storage.createSector(validatedData);
      res.status(201).json(sector);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/sectors/:id", authenticateToken, async (req, res) => {
    try {
      const sector = await storage.updateSector(req.params.id, req.body);
      res.json(sector);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/sectors/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteSector(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Neighborhood Units endpoints (Geographic data - public access for read operations)
  app.get("/api/neighborhood-units", async (req, res) => {
    try {
      const { neighborhoodId, sectorId } = req.query;
      const filters = neighborhoodId || sectorId ? { neighborhoodId: neighborhoodId as string, sectorId: sectorId as string } : undefined;
      const neighborhoodUnits = await storage.getNeighborhoodUnits(filters);
      res.json(neighborhoodUnits);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/neighborhood-units/:id", async (req, res) => {
    try {
      const neighborhoodUnit = await storage.getNeighborhoodUnit(req.params.id);
      if (!neighborhoodUnit) {
        return res.status(404).json({ message: "Neighborhood unit not found" });
      }
      res.json(neighborhoodUnit);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/neighborhoods/:id/neighborhood-units", async (req, res) => {
    try {
      const neighborhoodUnits = await storage.getNeighborhoodUnitsByNeighborhoodId(req.params.id);
      res.json(neighborhoodUnits);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sectors/:id/neighborhood-units", async (req, res) => {
    try {
      const neighborhoodUnits = await storage.getNeighborhoodUnitsBySectorId(req.params.id);
      res.json(neighborhoodUnits);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/neighborhood-units", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertNeighborhoodUnitSchema.parse(req.body);
      const neighborhoodUnit = await storage.createNeighborhoodUnit(validatedData);
      res.status(201).json(neighborhoodUnit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/neighborhood-units/:id", authenticateToken, async (req, res) => {
    try {
      const neighborhoodUnit = await storage.updateNeighborhoodUnit(req.params.id, req.body);
      res.json(neighborhoodUnit);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/neighborhood-units/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteNeighborhoodUnit(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Blocks endpoints (Geographic data - public access for read operations)
  app.get("/api/blocks", async (req, res) => {
    try {
      const { neighborhoodUnitId } = req.query;
      const blocks = await storage.getBlocks(neighborhoodUnitId as string);
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/blocks/:id", async (req, res) => {
    try {
      const block = await storage.getBlock(req.params.id);
      if (!block) {
        return res.status(404).json({ message: "Block not found" });
      }
      res.json(block);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/neighborhood-units/:id/blocks", async (req, res) => {
    try {
      const blocks = await storage.getBlocksByNeighborhoodUnitId(req.params.id);
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/blocks", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertBlockSchema.parse(req.body);
      const block = await storage.createBlock(validatedData);
      res.status(201).json(block);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/blocks/:id", authenticateToken, async (req, res) => {
    try {
      const block = await storage.updateBlock(req.params.id, req.body);
      res.json(block);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/blocks/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteBlock(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Plots endpoints (Geographic data - public access for read operations)
  app.get("/api/plots", async (req, res) => {
    try {
      const { blockId } = req.query;
      const plots = await storage.getPlots(blockId as string);
      res.json(plots);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/plots/:id", async (req, res) => {
    try {
      const plot = await storage.getPlot(req.params.id);
      if (!plot) {
        return res.status(404).json({ message: "Plot not found" });
      }
      res.json(plot);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/blocks/:id/plots", async (req, res) => {
    try {
      const plots = await storage.getPlotsByBlockId(req.params.id);
      res.json(plots);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/plots/by-number/:plotNumber/block/:blockId", async (req, res) => {
    try {
      const plot = await storage.getPlotByNumber(req.params.plotNumber, req.params.blockId);
      if (!plot) {
        return res.status(404).json({ message: "Plot not found" });
      }
      res.json(plot);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/plots", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertPlotSchema.parse(req.body);
      const plot = await storage.createPlot(validatedData);
      res.status(201).json(plot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/plots/:id", authenticateToken, async (req, res) => {
    try {
      const plot = await storage.updatePlot(req.params.id, req.body);
      res.json(plot);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/plots/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deletePlot(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Streets endpoints (Geographic data - public access for read operations)
  app.get("/api/streets", async (req, res) => {
    try {
      const streets = await storage.getStreets();
      res.json(streets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/streets/:id", async (req, res) => {
    try {
      const street = await storage.getStreet(req.params.id);
      if (!street) {
        return res.status(404).json({ message: "Street not found" });
      }
      res.json(street);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/streets", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertStreetSchema.parse(req.body);
      const street = await storage.createStreet(validatedData);
      res.status(201).json(street);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/streets/:id", authenticateToken, async (req, res) => {
    try {
      const street = await storage.updateStreet(req.params.id, req.body);
      res.json(street);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/streets/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteStreet(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Street Segments endpoints (Geographic data - public access for read operations)
  app.get("/api/street-segments", async (req, res) => {
    try {
      const { streetId } = req.query;
      const streetSegments = await storage.getStreetSegments(streetId as string);
      res.json(streetSegments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/street-segments/:id", async (req, res) => {
    try {
      const streetSegment = await storage.getStreetSegment(req.params.id);
      if (!streetSegment) {
        return res.status(404).json({ message: "Street segment not found" });
      }
      res.json(streetSegment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/streets/:id/street-segments", async (req, res) => {
    try {
      const streetSegments = await storage.getStreetSegmentsByStreetId(req.params.id);
      res.json(streetSegments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/street-segments", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertStreetSegmentSchema.parse(req.body);
      const streetSegment = await storage.createStreetSegment(validatedData);
      res.status(201).json(streetSegment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/street-segments/:id", authenticateToken, async (req, res) => {
    try {
      const streetSegment = await storage.updateStreetSegment(req.params.id, req.body);
      res.json(streetSegment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/street-segments/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteStreetSegment(req.params.id);
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

  // Handle malformed GET requests to /api/applications/assign BEFORE the generic applications route
  app.get('/api/applications/assign', (req, res) => {
    console.warn('⚠️ GET request to /api/applications/assign - should use POST with ID');
    res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint requires POST method with application ID',
      correctUsage: 'POST /api/applications/:id/assign',
      timestamp: new Date().toISOString()
    });
  });

  // Applications routes
  app.get("/api/applications", authenticateToken, async (req, res) => {
    try {
      const { status, applicantId, assignedToId, currentStage } = req.query;
      const applications = await storage.getApplications({
        status: status as string,
        applicantId: applicantId as string,
        assignedToId: assignedToId as string,
        currentStage: currentStage as string,
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
            paidAt: new Date(),
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

  app.delete("/api/notifications/:id", authenticateToken, async (req, res) => {
    try {
      // Note: This would need to be implemented in storage.ts
      // For now, we'll mark as read which effectively "hides" it
      await storage.markNotificationAsRead(req.params.id);
      res.json({ message: "Notification removed" });
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
        createdAt: new Date()
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
        updatedAt: new Date()
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

      const appData = application.applicationData as any;
      const invoiceData = {
        invoiceNumber,
        applicationId,
        applicationNumber: application.applicationNumber,
        applicantName: appData?.applicantName || 'غير محدد',
        applicantId: application.applicantId,
        contactPhone: appData?.phoneNumber || appData?.contactPhone || 'غير محدد',
        serviceType: appData?.serviceType || 'خدمة عامة',
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
        paymentDate: new Date()
      });

      // Create payment record (this would be stored in a payments table in real implementation)
      const paymentRecord = {
        id: `PAY-${Date.now()}`,
        applicationId,
        amount: amount || application.fees,
        paymentMethod: paymentMethod || 'cash',
        notes: notes || 'تم السداد في الصندوق',
        paymentDate: new Date(),
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
        
        const appData = app.applicationData as any;
        return {
          ...app,
          fees: fees.toString(),
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          paymentStatus: app.status === 'paid' ? 'paid' : 'pending',
          invoiceDate: app.updatedAt || app.createdAt,
          dueDate: new Date(Date.now() + (15 * 24 * 60 * 60 * 1000)), // 15 days from now
          applicationData: {
            ...appData,
            area: appData?.area || '700'
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
        status: 'paid'
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

      // Update application assignment - send to assistant manager first
      await storage.updateApplication(applicationId, {
        assignedToId,
        status: 'assigned',
        currentStage: 'waiting_scheduling'
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
        newStage: 'waiting_scheduling',
        changedById: req.user?.id || '',
        notes: `تم تكليف مهندس ونقل الطلب لمساعد المدير للجدولة: ${notes || ''}`
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
          createdAt: new Date(),
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

  // ======= APPOINTMENTS MANAGEMENT API =======

  // Get appointments with filtering
  app.get("/api/appointments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, assignedToId, status, confirmationStatus } = req.query;
      
      const appointments = await storage.getAppointments({
        applicationId: applicationId as string,
        assignedToId: assignedToId as string,
        status: status as string,
        confirmationStatus: confirmationStatus as string,
      });

      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "خطأ في استرجاع المواعيد" });
    }
  });

  // Get specific appointment
  app.get("/api/appointments/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      
      if (!appointment) {
        return res.status(404).json({ message: "الموعد غير موجود" });
      }

      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "خطأ في استرجاع الموعد" });
    }
  });

  // Create new appointment
  app.post("/api/appointments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const appointment = await storage.createAppointment(req.body);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "خطأ في إنشاء الموعد" });
    }
  });

  // Update appointment
  app.put("/api/appointments/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const appointment = await storage.updateAppointment(req.params.id, req.body);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "خطأ في تحديث الموعد" });
    }
  });

  // Confirm appointment (by citizen or engineer)
  app.post("/api/appointments/:id/confirm", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { confirmedBy, notes } = req.body;
      
      if (!confirmedBy || !['citizen', 'engineer'].includes(confirmedBy)) {
        return res.status(400).json({ message: "نوع التأكيد مطلوب" });
      }

      const appointment = await storage.confirmAppointment(req.params.id, confirmedBy, notes);
      res.json(appointment);
    } catch (error) {
      console.error("Error confirming appointment:", error);
      res.status(500).json({ message: "خطأ في تأكيد الموعد" });
    }
  });

  // Get upcoming appointments for engineer
  app.get("/api/appointments/upcoming/:engineerId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { daysAhead } = req.query;
      const appointments = await storage.getUpcomingAppointments(
        req.params.engineerId,
        daysAhead ? parseInt(daysAhead as string) : 7
      );
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
      res.status(500).json({ message: "خطأ في استرجاع المواعيد القادمة" });
    }
  });

  // Schedule appointment for application
  app.post("/api/applications/:id/schedule", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const applicationId = req.params.id;
      const { assignedToId, appointmentDate, appointmentTime, contactPhone, contactNotes, location } = req.body;

      if (!assignedToId || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ message: "بيانات الموعد مطلوبة" });
      }

      const appointment = await storage.createAppointment({
        applicationId,
        assignedToId,
        scheduledById: req.user?.id as string,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        contactPhone,
        contactNotes,
        location,
        status: 'scheduled',
        confirmationStatus: 'pending'
      });

      // Update application status
      await storage.updateApplication(applicationId, {
        status: 'scheduled',
        currentStage: 'appointment_scheduling'
      });

      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      res.status(500).json({ message: "خطأ في تحديد الموعد" });
    }
  });

  // ======= CONTACT ATTEMPTS MANAGEMENT API =======

  // Get contact attempts
  app.get("/api/contact-attempts", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, appointmentId, attemptedById, isSuccessful } = req.query;
      
      const attempts = await storage.getContactAttempts({
        applicationId: applicationId as string,
        appointmentId: appointmentId as string,
        attemptedById: attemptedById as string,
        isSuccessful: isSuccessful === 'true' ? true : isSuccessful === 'false' ? false : undefined,
      });

      res.json(attempts);
    } catch (error) {
      console.error("Error fetching contact attempts:", error);
      res.status(500).json({ message: "خطأ في استرجاع محاولات التواصل" });
    }
  });

  // Create contact attempt
  app.post("/api/contact-attempts", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const attempt = await storage.createContactAttempt({
        ...req.body,
        attemptedById: req.user?.id as string,
      });
      res.status(201).json(attempt);
    } catch (error) {
      console.error("Error creating contact attempt:", error);
      res.status(500).json({ message: "خطأ في تسجيل محاولة التواصل" });
    }
  });

  // Get contact attempts for application
  app.get("/api/applications/:id/contact-attempts", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const attempts = await storage.getContactAttemptsForApplication(req.params.id);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching contact attempts for application:", error);
      res.status(500).json({ message: "خطأ في استرجاع محاولات التواصل للطلب" });
    }
  });

  // Mark contact attempt as successful
  app.put("/api/contact-attempts/:id/success", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { notes } = req.body;
      const attempt = await storage.markContactAttemptSuccessful(req.params.id, notes);
      res.json(attempt);
    } catch (error) {
      console.error("Error marking contact attempt as successful:", error);
      res.status(500).json({ message: "خطأ في تحديث حالة محاولة التواصل" });
    }
  });

  // ======= SURVEY ASSIGNMENT FORMS API =======

  // Get survey assignment forms
  app.get("/api/assignment-forms", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, assignedToId, status } = req.query;
      
      const forms = await storage.getSurveyAssignmentForms({
        applicationId: applicationId as string,
        assignedToId: assignedToId as string,
        status: status as string,
      });

      res.json(forms);
    } catch (error) {
      console.error("Error fetching assignment forms:", error);
      res.status(500).json({ message: "خطأ في استرجاع نماذج التكليف" });
    }
  });

  // Get specific assignment form
  app.get("/api/assignment-forms/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const form = await storage.getSurveyAssignmentForm(req.params.id);
      
      if (!form) {
        return res.status(404).json({ message: "نموذج التكليف غير موجود" });
      }

      res.json(form);
    } catch (error) {
      console.error("Error fetching assignment form:", error);
      res.status(500).json({ message: "خطأ في استرجاع نموذج التكليف" });
    }
  });

  // Create survey assignment form
  app.post("/api/assignment-forms", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const form = await storage.createSurveyAssignmentForm(req.body);
      res.status(201).json(form);
    } catch (error) {
      console.error("Error creating assignment form:", error);
      res.status(500).json({ message: "خطأ في إنشاء نموذج التكليف" });
    }
  });

  // Update assignment form
  app.put("/api/assignment-forms/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const form = await storage.updateSurveyAssignmentForm(req.params.id, req.body);
      res.json(form);
    } catch (error) {
      console.error("Error updating assignment form:", error);
      res.status(500).json({ message: "خطأ في تحديث نموذج التكليف" });
    }
  });

  // Mark form as printed
  app.put("/api/assignment-forms/:id/print", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const form = await storage.markFormAsPrinted(req.params.id);
      res.json(form);
    } catch (error) {
      console.error("Error marking form as printed:", error);
      res.status(500).json({ message: "خطأ في تحديث حالة الطباعة" });
    }
  });

  // Mark form as signed
  app.put("/api/assignment-forms/:id/sign", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { supervisorSignature } = req.body;
      
      if (!supervisorSignature) {
        return res.status(400).json({ message: "توقيع المشرف مطلوب" });
      }

      const form = await storage.markFormAsSigned(req.params.id, supervisorSignature);
      res.json(form);
    } catch (error) {
      console.error("Error marking form as signed:", error);
      res.status(500).json({ message: "خطأ في تحديث حالة التوقيع" });
    }
  });

  // ======= ENGINEER APIS =======

  // Get engineer workload dashboard data
  app.get('/api/engineer/workload/:engineerId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { engineerId } = req.params;
      const workload = await storage.getEngineerWorkload(engineerId);
      res.json(workload);
    } catch (error) {
      console.error('Error fetching engineer workload:', error);
      res.status(500).json({ error: 'فشل في استرجاع أعباء المهندس' });
    }
  });

  // Get engineer operation details
  app.get('/api/engineer/operations/:engineerId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { engineerId } = req.params;
      const operations = await storage.getEngineerOperationDetails(engineerId);
      res.json(operations);
    } catch (error) {
      console.error('Error fetching engineer operations:', error);
      res.status(500).json({ error: 'فشل في استرجاع تفاصيل العمليات' });
    }
  });

  // Get engineer appointments
  app.get('/api/engineer/appointments/:engineerId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { engineerId } = req.params;
      const { status } = req.query;
      
      const appointments = await storage.getAppointments({
        assignedToId: engineerId,
        status: status as string
      });
      
      res.json(appointments);
    } catch (error) {
      console.error('Error fetching engineer appointments:', error);
      res.status(500).json({ error: 'فشل في استرجاع مواعيد المهندس' });
    }
  });

  // Confirm appointment by engineer
  app.put('/api/engineer/appointments/:appointmentId/confirm', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { appointmentId } = req.params;
      const { notes } = req.body;
      
      const appointment = await storage.updateAppointment(appointmentId, {
        status: 'confirmed'
      });
      
      res.json(appointment);
    } catch (error) {
      console.error('Error confirming appointment:', error);
      res.status(500).json({ error: 'فشل في تأكيد الموعد' });
    }
  });

  // ======= FIELD VISITS APIS =======

  // Get field visits for engineer
  app.get('/api/field-visits/engineer/:engineerId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { engineerId } = req.params;
      const { status } = req.query;
      
      const visits = await storage.getEngineerFieldVisits(engineerId, status as string);
      res.json(visits);
    } catch (error) {
      console.error('Error fetching field visits:', error);
      res.status(500).json({ error: 'فشل في استرجاع الزيارات الميدانية' });
    }
  });

  // Get field visit by ID
  app.get('/api/field-visits/:visitId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { visitId } = req.params;
      const visit = await storage.getFieldVisit(visitId);
      
      if (!visit) {
        return res.status(404).json({ error: 'الزيارة الميدانية غير موجودة' });
      }
      
      res.json(visit);
    } catch (error) {
      console.error('Error fetching field visit:', error);
      res.status(500).json({ error: 'فشل في استرجاع الزيارة الميدانية' });
    }
  });

  // Create field visit
  app.post('/api/field-visits', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const visitData = req.body;
      const visit = await storage.createFieldVisit(visitData);
      res.status(201).json(visit);
    } catch (error) {
      console.error('Error creating field visit:', error);
      res.status(500).json({ error: 'فشل في إنشاء الزيارة الميدانية' });
    }
  });

  // Start field visit
  app.put('/api/field-visits/:visitId/start', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { visitId } = req.params;
      const { gpsLocation } = req.body;
      
      const visit = await storage.startFieldVisit(visitId, gpsLocation);
      res.json(visit);
    } catch (error) {
      console.error('Error starting field visit:', error);
      res.status(500).json({ error: 'فشل في بدء الزيارة الميدانية' });
    }
  });

  // Complete field visit
  app.put('/api/field-visits/:visitId/complete', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { visitId } = req.params;
      const { notes, requiresFollowUp, followUpReason } = req.body;
      
      const visit = await storage.completeFieldVisit(visitId, notes, requiresFollowUp, followUpReason);
      res.json(visit);
    } catch (error) {
      console.error('Error completing field visit:', error);
      res.status(500).json({ error: 'فشل في إكمال الزيارة الميدانية' });
    }
  });

  // Update field visit
  app.put('/api/field-visits/:visitId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { visitId } = req.params;
      const updates = req.body;
      
      const visit = await storage.updateFieldVisit(visitId, updates);
      res.json(visit);
    } catch (error) {
      console.error('Error updating field visit:', error);
      res.status(500).json({ error: 'فشل في تحديث الزيارة الميدانية' });
    }
  });

  // ======= SURVEY RESULTS APIS =======

  // Get survey results
  app.get('/api/survey-results', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const filters = req.query;
      const results = await storage.getSurveyResults(filters);
      res.json(results);
    } catch (error) {
      console.error('Error fetching survey results:', error);
      res.status(500).json({ error: 'فشل في استرجاع نتائج المساحة' });
    }
  });

  // Get survey result by ID
  app.get('/api/survey-results/:resultId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { resultId } = req.params;
      const result = await storage.getSurveyResult(resultId);
      
      if (!result) {
        return res.status(404).json({ error: 'نتيجة المساحة غير موجودة' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching survey result:', error);
      res.status(500).json({ error: 'فشل في استرجاع نتيجة المساحة' });
    }
  });

  // Create survey result
  app.post('/api/survey-results', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const resultData = req.body;
      const result = await storage.createSurveyResult(resultData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating survey result:', error);
      res.status(500).json({ error: 'فشل في إنشاء نتيجة المساحة' });
    }
  });

  // Update survey result
  app.put('/api/survey-results/:resultId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { resultId } = req.params;
      const updates = req.body;
      
      const result = await storage.updateSurveyResult(resultId, updates);
      res.json(result);
    } catch (error) {
      console.error('Error updating survey result:', error);
      res.status(500).json({ error: 'فشل في تحديث نتيجة المساحة' });
    }
  });

  // Complete survey result
  app.put('/api/survey-results/:resultId/complete', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { resultId } = req.params;
      const result = await storage.completeSurveyResult(resultId);
      res.json(result);
    } catch (error) {
      console.error('Error completing survey result:', error);
      res.status(500).json({ error: 'فشل في إكمال نتيجة المساحة' });
    }
  });

  // ======= SURVEY REPORTS APIS =======

  // Get survey reports
  app.get('/api/survey-reports', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const filters = req.query;
      const reports = await storage.getSurveyReports(filters);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching survey reports:', error);
      res.status(500).json({ error: 'فشل في استرجاع تقارير المساحة' });
    }
  });

  // Create survey report
  app.post('/api/survey-reports', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const reportData = req.body;
      const report = await storage.createSurveyReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      console.error('Error creating survey report:', error);
      res.status(500).json({ error: 'فشل في إنشاء تقرير المساحة' });
    }
  });

  // Get public reports for application (for citizens)
  app.get('/api/applications/:applicationId/public-reports', async (req, res) => {
    try {
      const { applicationId } = req.params;
      const reports = await storage.getPublicReportsForApplication(applicationId);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching public reports:', error);
      res.status(500).json({ error: 'فشل في استرجاع التقارير العامة' });
    }
  });

  // ===========================================
  // MOBILE SYNC & OFFLINE OPERATIONS API
  // ===========================================

  // Pull changes from server (differential sync)
  app.post('/api/sync/pull', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Import sync registry for security validation and Zod schemas
      const { isTableSyncable, canUserSyncTable, generateLBACFilter, getSyncableTablesForUser, SyncPullRequestSchema, validateSyncPayload } = await import('./syncRegistry');
      
      // CRITICAL: Validate payload with Zod first to prevent injection attacks
      const payloadValidation = validateSyncPayload(SyncPullRequestSchema, req.body);
      if (!payloadValidation.success) {
        return res.status(400).json({ 
          error: 'بيانات الطلب غير صحيحة',
          details: payloadValidation.errors 
        });
      }
      
      const { deviceId, lastSyncTimestamp, tables } = payloadValidation.data;
      
      // Verify device registration
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || !device.isActive) {
        return res.status(404).json({ error: 'جهاز غير مسجل أو غير مفعل' });
      }

      // Create sync session
      const session = await storage.createSyncSession({
        deviceId: device.id,
        userId: req.user!.id,
        sessionType: 'pull',
        status: 'in_progress',
        startTime: new Date(),
        lastSyncTimestamp: lastSyncTimestamp ? new Date(lastSyncTimestamp) : undefined
      });

      const changes: { [tableName: string]: any[] } = {};
      const errors: { [tableName: string]: string } = {};
      let totalChanges = 0;
      let failedTables = 0;

      // Validate requested tables against user permissions
      const allowedTables = getSyncableTablesForUser(req.user!);
      const filteredTables = tables.filter((tableName: string) => {
        if (!isTableSyncable(tableName)) {
          errors[tableName] = `الجدول ${tableName} غير مسموح للمزامنة`;
          return false;
        }
        
        if (!canUserSyncTable(req.user!, tableName, 'read')) {
          errors[tableName] = `ليس لديك صلاحية قراءة الجدول ${tableName}`;
          return false;
        }
        
        return true;
      });

      // Get changes for each validated table
      for (const tableName of filteredTables) {
        try {
          // Apply LBAC filtering
          const lbacFilter = generateLBACFilter(req.user!, tableName);
          
          const records = await storage.getChangedRecords(
            tableName,
            lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0),
            1000, // Limit per table
            lbacFilter,
            req.user! // CRITICAL: Pass user for record-level RBAC validation
          );
          changes[tableName] = records;
          totalChanges += records.length;
        } catch (error) {
          console.error(`Error fetching changes for ${tableName}:`, error);
          errors[tableName] = `خطأ في استرجاع البيانات: ${(error as Error).message}`;
          failedTables++;
        }
      }

      // Update session statistics with accurate counts
      await storage.completeSyncSession(session.id, new Date(), {
        totalOperations: tables.length, // Total tables requested
        successfulOperations: filteredTables.length - failedTables, // Successfully processed tables
        failedOperations: failedTables, // Failed tables due to errors
        conflictOperations: 0 // No conflicts in pull operations
      });

      // Update device last sync timestamp only if successful
      if (failedTables === 0) {
        await storage.updateDeviceLastSync(deviceId);
      }

      res.json({
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        changes,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        totalChanges,
        tablesRequested: tables.length,
        tablesProcessed: filteredTables.length,
        tablesFailed: failedTables,
        hasMoreChanges: totalChanges >= 1000 * filteredTables.length
      });
    } catch (error) {
      console.error('Error in sync pull:', error);
      res.status(500).json({ error: 'فشل في مزامنة البيانات' });
    }
  });

  // Push local changes to server
  app.post('/api/sync/push', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Import sync registry for security validation and Zod schemas
      const { validateSyncOperation, SyncPushRequestSchema, validateSyncPayload } = await import('./syncRegistry');
      
      // CRITICAL: Validate payload with Zod first to prevent injection attacks
      const payloadValidation = validateSyncPayload(SyncPushRequestSchema, req.body);
      if (!payloadValidation.success) {
        return res.status(400).json({ 
          error: 'بيانات العمليات غير صحيحة',
          details: payloadValidation.errors 
        });
      }
      
      const { deviceId, operations } = payloadValidation.data;
      
      // Verify device registration
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || !device.isActive) {
        return res.status(404).json({ error: 'جهاز غير مسجل أو غير مفعل' });
      }

      // Create sync session
      const session = await storage.createSyncSession({
        deviceId: device.id,
        userId: req.user!.id,
        sessionType: 'push',
        status: 'in_progress',
        startTime: new Date()
      });

      const results = { success: 0, conflicts: 0, errors: 0, validationErrors: 0 };
      const validationErrors: string[] = [];

      // Process each operation with validation
      for (const op of operations) {
        try {
          // Import LBAC filtering for push operations security
          const { generateLBACFilter } = await import('./syncRegistry');
          
          // Validate the sync operation with record data for RBAC
          const validation = validateSyncOperation(req.user!, op.tableName, op.type, op.recordId, op.newData);
          
          if (!validation.isValid) {
            validationErrors.push(`${op.tableName}:${op.recordId} - ${validation.error}`);
            results.validationErrors++;
            continue;
          }

          // CRITICAL: Apply LBAC filtering to PUSH operations (same as PULL)
          // Engineers should not be able to push data outside their assigned geographic areas
          const lbacFilter = generateLBACFilter(req.user!, op.tableName);
          if (lbacFilter && op.newData) {
            // Check if the data being pushed violates LBAC restrictions
            let lbacViolation = false;
            
            if (lbacFilter.type === 'drizzle_condition') {
              const fieldValue = op.newData[lbacFilter.field];
              
              if (lbacFilter.operator === 'in') {
                // Check if the record's location field is in user's allowed values
                if (!lbacFilter.values.includes(fieldValue)) {
                  lbacViolation = true;
                }
              } else if (lbacFilter.operator === 'eq') {
                // Check equality
                if (fieldValue !== lbacFilter.values[0]) {
                  lbacViolation = true;
                }
              }
            }
            
            if (lbacViolation) {
              validationErrors.push(`${op.tableName}:${op.recordId} - غير مسموح لك بالكتابة في هذا الموقع الجغرافي`);
              results.validationErrors++;
              continue;
            }
          }

          // Store offline operation for tracking
          const offlineOp = await storage.createOfflineOperation({
            deviceId: device.id,
            userId: req.user!.id,
            operationType: op.type,
            tableName: op.tableName,
            recordId: op.recordId,
            oldData: op.oldData || null,
            newData: op.newData,
            localTimestamp: new Date(op.timestamp),
            status: 'pending'
          });

          // Apply bulk changes for this operation
          const result = await storage.applyBulkChanges(op.tableName, [offlineOp]);
          results.success += result.success;
          results.conflicts += result.conflicts;
          results.errors += result.errors;

        } catch (error) {
          console.error('Error processing operation:', error);
          results.errors++;
        }
      }

      // Update session with accurate results
      await storage.completeSyncSession(session.id, new Date(), {
        totalOperations: operations.length,
        successfulOperations: results.success,
        failedOperations: results.errors + results.validationErrors,
        conflictOperations: results.conflicts
      });

      res.json({
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        results,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        processed: operations.length,
        breakdown: {
          successful: results.success,
          conflicts: results.conflicts,
          errors: results.errors,
          validationErrors: results.validationErrors
        }
      });
    } catch (error) {
      console.error('Error in sync push:', error);
      res.status(500).json({ error: 'فشل في رفع التغييرات' });
    }
  });

  // Resolve sync conflicts
  app.post('/api/sync/resolve-conflicts', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Import sync registry for Zod validation
      const { SyncResolveConflictsSchema, validateSyncPayload } = await import('./syncRegistry');
      
      // CRITICAL: Validate payload with Zod first
      const payloadValidation = validateSyncPayload(SyncResolveConflictsSchema, req.body);
      if (!payloadValidation.success) {
        return res.status(400).json({ 
          error: 'بيانات حل التعارضات غير صحيحة',
          details: payloadValidation.errors 
        });
      }
      
      const { sessionId, resolutions } = payloadValidation.data;
      
      // Verify session exists
      const session = await storage.getSyncSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'جلسة المزامنة غير موجودة' });
      }

      const results = { resolved: 0, failed: 0 };

      // Process each conflict resolution
      for (const resolution of resolutions) {
        try {
          await storage.resolveSyncConflict(
            resolution.conflictId,
            resolution.strategy, // server_wins, client_wins, merge, manual
            resolution.resolvedData,
            req.user!.id
          );
          results.resolved++;
        } catch (error) {
          console.error('Error resolving conflict:', error);
          results.failed++;
        }
      }

      res.json({
        sessionId,
        timestamp: new Date().toISOString(),
        results,
        processed: resolutions.length
      });
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      res.status(500).json({ error: 'فشل في حل التعارضات' });
    }
  });

  // Get device sync status (helper endpoint)
  app.get('/api/sync/status/:deviceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { deviceId } = req.params;
      
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        return res.status(404).json({ error: 'الجهاز غير موجود' });
      }

      const pendingOps = await storage.getPendingOperations(device.id);
      const unresolvedConflicts = await storage.getUnresolvedConflicts();

      res.json({
        device: {
          id: device.id,
          deviceId: device.deviceId,
          lastSync: device.lastSync,
          isActive: device.isActive
        },
        pendingOperations: pendingOps.length,
        unresolvedConflicts: unresolvedConflicts.length,
        status: device.isActive ? 'active' : 'inactive'
      });
    } catch (error) {
      console.error('Error getting sync status:', error);
      res.status(500).json({ error: 'فشل في استرجاع حالة المزامنة' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
