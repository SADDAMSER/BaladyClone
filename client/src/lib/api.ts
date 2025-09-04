import { apiRequest } from "./queryClient";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  nationalId?: string;
  phoneNumber?: string;
  role?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    return response.json();
  },

  register: async (userData: RegisterRequest): Promise<{ message: string; user: any }> => {
    const response = await apiRequest("POST", "/api/auth/register", userData);
    return response.json();
  },
};

export const applicationsApi = {
  getAll: async (filters?: { status?: string; applicantId?: string; assignedToId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.applicantId) params.append('applicantId', filters.applicantId);
    if (filters?.assignedToId) params.append('assignedToId', filters.assignedToId);
    
    const response = await apiRequest("GET", `/api/applications?${params}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest("GET", `/api/applications/${id}`);
    return response.json();
  },

  create: async (data: any) => {
    const response = await apiRequest("POST", "/api/applications", data);
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await apiRequest("PUT", `/api/applications/${id}`, data);
    return response.json();
  },
};

export const surveyingApi = {
  getAll: async (filters?: { status?: string; surveyorId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.surveyorId) params.append('surveyorId', filters.surveyorId);
    
    const response = await apiRequest("GET", `/api/surveying-decisions?${params}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest("GET", `/api/surveying-decisions/${id}`);
    return response.json();
  },

  create: async (data: any) => {
    const response = await apiRequest("POST", "/api/surveying-decisions", data);
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await apiRequest("PUT", `/api/surveying-decisions/${id}`, data);
    return response.json();
  },
};

export const requirementsApi = {
  getCategories: async () => {
    const response = await apiRequest("GET", "/api/requirement-categories");
    return response.json();
  },

  getAll: async (categoryId?: string) => {
    const params = categoryId ? `?categoryId=${categoryId}` : '';
    const response = await apiRequest("GET", `/api/requirements${params}`);
    return response.json();
  },

  search: async (query: string) => {
    const response = await apiRequest("GET", `/api/search/requirements?q=${encodeURIComponent(query)}`);
    return response.json();
  },

  create: async (data: any) => {
    const response = await apiRequest("POST", "/api/requirements", data);
    return response.json();
  },
};

export const legalApi = {
  getLaws: async () => {
    const response = await apiRequest("GET", "/api/laws");
    return response.json();
  },

  getLawSections: async (lawId: string) => {
    const response = await apiRequest("GET", `/api/laws/${lawId}/sections`);
    return response.json();
  },

  getSectionArticles: async (sectionId: string) => {
    const response = await apiRequest("GET", `/api/sections/${sectionId}/articles`);
    return response.json();
  },

  searchArticles: async (query: string) => {
    const response = await apiRequest("GET", `/api/search/articles?q=${encodeURIComponent(query)}`);
    return response.json();
  },
};

export const organizationApi = {
  getDepartments: async () => {
    const response = await apiRequest("GET", "/api/departments");
    return response.json();
  },

  getPositions: async (departmentId?: string) => {
    const params = departmentId ? `?departmentId=${departmentId}` : '';
    const response = await apiRequest("GET", `/api/positions${params}`);
    return response.json();
  },

  getUsers: async (filters?: { role?: string; departmentId?: string; isActive?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    
    const response = await apiRequest("GET", `/api/users?${params}`);
    return response.json();
  },

  createDepartment: async (data: any) => {
    const response = await apiRequest("POST", "/api/departments", data);
    return response.json();
  },

  createPosition: async (data: any) => {
    const response = await apiRequest("POST", "/api/positions", data);
    return response.json();
  },
};

export const tasksApi = {
  getAll: async (filters?: { assignedToId?: string; status?: string; applicationId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.assignedToId) params.append('assignedToId', filters.assignedToId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.applicationId) params.append('applicationId', filters.applicationId);
    
    const response = await apiRequest("GET", `/api/tasks?${params}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest("GET", `/api/tasks/${id}`);
    return response.json();
  },

  create: async (data: any) => {
    const response = await apiRequest("POST", "/api/tasks", data);
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await apiRequest("PUT", `/api/tasks/${id}`, data);
    return response.json();
  },
};

export const dashboardApi = {
  getStats: async () => {
    const response = await apiRequest("GET", "/api/dashboard/stats");
    return response.json();
  },
};

export const searchApi = {
  global: async (query: string) => {
    const response = await apiRequest("GET", `/api/search?q=${encodeURIComponent(query)}`);
    return response.json();
  },
};
