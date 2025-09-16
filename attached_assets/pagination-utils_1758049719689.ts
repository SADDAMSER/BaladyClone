/**
 * Pagination and Filtering Utilities for Yemen Platform API
 * 
 * هذا الملف يحتوي على دوال مساعدة لتطبيق التصفح والبحث والتصفية
 * في استعلامات قاعدة البيانات باستخدام Drizzle ORM
 */

import { sql, SQL, and, or, eq, like, gte, lte, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

// Schema للتحقق من معاملات التصفح
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  filters: z.record(z.string()).optional()
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// نوع البيانات المُرجعة مع معلومات التصفح
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

/**
 * دالة لبناء استعلام التصفح
 * @param baseQuery - الاستعلام الأساسي
 * @param params - معاملات التصفح
 * @param searchableFields - الحقول القابلة للبحث
 * @param filterableFields - الحقول القابلة للتصفية
 * @param sortableFields - الحقول القابلة للترتيب
 */
export function buildPaginatedQuery<T>(
  baseQuery: any,
  params: PaginationParams,
  searchableFields: string[] = [],
  filterableFields: Record<string, any> = {},
  sortableFields: Record<string, any> = {}
) {
  let query = baseQuery;
  const conditions: SQL[] = [];

  // إضافة شروط البحث
  if (params.search && searchableFields.length > 0) {
    const searchConditions = searchableFields.map(field => {
      const column = filterableFields[field];
      if (column) {
        return like(column, `%${params.search}%`);
      }
      return null;
    }).filter(Boolean);

    if (searchConditions.length > 0) {
      conditions.push(or(...searchConditions));
    }
  }

  // إضافة شروط التصفية
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      const column = filterableFields[key];
      if (column && value !== undefined && value !== '') {
        // التعامل مع أنواع مختلفة من التصفية
        if (Array.isArray(value)) {
          // تصفية متعددة القيم (IN clause)
          conditions.push(sql`${column} = ANY(${value})`);
        } else if (typeof value === 'string' && value.includes(',')) {
          // قائمة مفصولة بفواصل
          const values = value.split(',').map(v => v.trim());
          conditions.push(sql`${column} = ANY(${values})`);
        } else {
          // تصفية بقيمة واحدة
          conditions.push(eq(column, value));
        }
      }
    });
  }

  // تطبيق الشروط على الاستعلام
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  // إضافة الترتيب
  if (params.sortBy && sortableFields[params.sortBy]) {
    const sortColumn = sortableFields[params.sortBy];
    const sortFunction = params.sortOrder === 'asc' ? asc : desc;
    query = query.orderBy(sortFunction(sortColumn));
  }

  // حساب offset للتصفح
  const offset = (params.page - 1) * params.limit;

  // إضافة limit و offset
  query = query.limit(params.limit).offset(offset);

  return query;
}

/**
 * دالة لحساب العدد الإجمالي للسجلات
 */
export async function getTotalCount(
  db: any,
  table: any,
  conditions: SQL[] = []
): Promise<number> {
  let countQuery = db.select({ count: sql`count(*)` }).from(table);
  
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions));
  }

  const result = await countQuery;
  return parseInt(result[0]?.count || '0');
}

/**
 * دالة شاملة لتنفيذ التصفح مع حساب العدد الإجمالي
 */
export async function executePaginatedQuery<T>(
  db: any,
  table: any,
  params: PaginationParams,
  searchableFields: string[] = [],
  filterableFields: Record<string, any> = {},
  sortableFields: Record<string, any> = {},
  baseConditions: SQL[] = []
): Promise<PaginatedResponse<T>> {
  // بناء شروط البحث والتصفية
  const searchConditions: SQL[] = [];
  
  // إضافة شروط البحث
  if (params.search && searchableFields.length > 0) {
    const searchConds = searchableFields.map(field => {
      const column = filterableFields[field];
      if (column) {
        return like(column, `%${params.search}%`);
      }
      return null;
    }).filter(Boolean);

    if (searchConds.length > 0) {
      searchConditions.push(or(...searchConds));
    }
  }

  // إضافة شروط التصفية
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      const column = filterableFields[key];
      if (column && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          searchConditions.push(sql`${column} = ANY(${value})`);
        } else if (typeof value === 'string' && value.includes(',')) {
          const values = value.split(',').map(v => v.trim());
          searchConditions.push(sql`${column} = ANY(${values})`);
        } else {
          searchConditions.push(eq(column, value));
        }
      }
    });
  }

  // دمج جميع الشروط
  const allConditions = [...baseConditions, ...searchConditions];

  // حساب العدد الإجمالي
  const total = await getTotalCount(db, table, allConditions);

  // بناء استعلام البيانات
  let dataQuery = db.select().from(table);

  // تطبيق الشروط
  if (allConditions.length > 0) {
    dataQuery = dataQuery.where(and(...allConditions));
  }

  // إضافة الترتيب
  if (params.sortBy && sortableFields[params.sortBy]) {
    const sortColumn = sortableFields[params.sortBy];
    const sortFunction = params.sortOrder === 'asc' ? asc : desc;
    dataQuery = dataQuery.orderBy(sortFunction(sortColumn));
  }

  // إضافة التصفح
  const offset = (params.page - 1) * params.limit;
  dataQuery = dataQuery.limit(params.limit).offset(offset);

  // تنفيذ الاستعلام
  const data = await dataQuery;

  // حساب معلومات التصفح
  const totalPages = Math.ceil(total / params.limit);
  const hasNext = params.page < totalPages;
  const hasPrev = params.page > 1;

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    },
    filters: params.filters,
    sort: params.sortBy ? {
      field: params.sortBy,
      order: params.sortOrder
    } : undefined
  };
}

/**
 * دالة للتحقق من صحة معاملات التصفح
 */
export function validatePaginationParams(query: any): PaginationParams {
  try {
    return paginationSchema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`معاملات التصفح غير صحيحة: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * دالة لإنشاء response معياري للأخطاء
 */
export function createErrorResponse(message: string, statusCode: number = 400) {
  return {
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

/**
 * دالة لإنشاء response معياري للنجاح
 */
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

