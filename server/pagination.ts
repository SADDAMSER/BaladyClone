/**
 * Pagination and Query Utilities for Yemen Platform
 * 
 * مساعدات التصفح والاستعلام لمنصة بناء اليمن
 */

import { SQL, sql, and, or, eq, like, desc, asc, count } from 'drizzle-orm';
import { z } from 'zod';

// Schema للتحقق من معاملات التصفح
export const paginationParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  filters: z.record(z.string()).optional()
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

// تنسيق الاستجابة الموحد
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
    hasNext: boolean;
    hasPrev: boolean;
    sort?: {
      field: string;
      order: 'asc' | 'desc';
    };
    filters?: Record<string, any>;
  };
}

/**
 * دالة لتحليل معاملات التصفح من query string
 */
export function parsePaginationParams(query: any): PaginationParams {
  try {
    // معالجة خاصة للفلاتر
    const processedQuery = { ...query };
    
    // إذا كانت الفلاتر مرسلة كـ filters[key]=value
    const filters: Record<string, string> = {};
    Object.keys(query).forEach(key => {
      if (key.startsWith('filters[') && key.endsWith(']')) {
        const filterKey = key.slice(8, -1); // إزالة 'filters[' و ']'
        filters[filterKey] = query[key];
        delete processedQuery[key];
      }
    });
    
    if (Object.keys(filters).length > 0) {
      processedQuery.filters = filters;
    }

    return paginationParamsSchema.parse(processedQuery);
  } catch (error) {
    throw new Error(`معاملات التصفح غير صحيحة: ${error}`);
  }
}

/**
 * دالة للتحقق من معاملات التصفح مع السماح بـ ZodError propagation للـ routes
 */
export function validatePaginationParams(query: any): PaginationParams {
  // معالجة خاصة للفلاتر
  const processedQuery = { ...query };
  
  // إذا كانت الفلاتر مرسلة كـ filters[key]=value
  const filters: Record<string, string> = {};
  Object.keys(query).forEach(key => {
    if (key.startsWith('filters[') && key.endsWith(']')) {
      const filterKey = key.slice(8, -1); // إزالة 'filters[' و ']'
      filters[filterKey] = query[key];
      delete processedQuery[key];
    }
  });
  
  if (Object.keys(filters).length > 0) {
    processedQuery.filters = filters;
  }

  // Let ZodError propagate to routes for proper 400 error handling
  return paginationParamsSchema.parse(processedQuery);
}

/**
 * دالة لبناء ORDER BY clause
 */
export function buildOrderBy(
  sortBy?: string, 
  sortOrder: 'asc' | 'desc' = 'desc',
  allowedSortFields: Record<string, any> = {}
): SQL | undefined {
  if (!sortBy || !allowedSortFields[sortBy]) {
    return undefined;
  }

  const column = allowedSortFields[sortBy];
  return sortOrder === 'asc' ? asc(column) : desc(column);
}

/**
 * دالة لبناء شروط البحث
 */
export function buildSearchConditions(
  searchTerm?: string,
  searchableFields: any[] = []
): SQL | undefined {
  if (!searchTerm || !searchTerm.trim() || searchableFields.length === 0) {
    return undefined;
  }

  const term = `%${searchTerm.trim()}%`;
  const searchConditions = searchableFields.map(field => like(field, term));
  
  return searchConditions.length > 1 ? or(...searchConditions) : searchConditions[0];
}

/**
 * دالة لبناء شروط التصفية
 */
export function buildFilterConditions(
  filters?: Record<string, any>,
  allowedFilterFields: Record<string, any> = {}
): SQL[] {
  if (!filters) return [];

  const conditions: SQL[] = [];
  
  Object.entries(filters).forEach(([key, value]) => {
    const column = allowedFilterFields[key];
    if (!column || value === undefined || value === '') return;

    if (Array.isArray(value)) {
      // Multiple values - OR condition
      const orConditions = value.map(v => eq(column, v));
      if (orConditions.length > 0) {
        conditions.push(orConditions.length === 1 ? orConditions[0] : or(...orConditions));
      }
    } else if (typeof value === 'string' && value.includes(',')) {
      // Comma separated values
      const values = value.split(',').map(v => v.trim()).filter(v => v);
      const orConditions = values.map(v => eq(column, v));
      if (orConditions.length > 0) {
        conditions.push(orConditions.length === 1 ? orConditions[0] : or(...orConditions));
      }
    } else {
      // Single value
      conditions.push(eq(column, value));
    }
  });

  return conditions;
}

/**
 * دالة شاملة لتنفيذ استعلام مع تصفح
 */
export async function executePaginatedQuery<T>(
  db: any,
  table: any,
  params: PaginationParams,
  config: {
    searchableFields?: any[];
    sortableFields?: Record<string, any>;
    filterableFields?: Record<string, any>;
    baseConditions?: SQL[];
  } = {}
): Promise<PaginatedResponse<T>> {
  const {
    searchableFields = [],
    sortableFields = {},
    filterableFields = {},
    baseConditions = []
  } = config;

  // بناء شروط الاستعلام
  const conditions: SQL[] = [...baseConditions];
  
  // إضافة شروط البحث
  const searchCondition = buildSearchConditions(params.search, searchableFields);
  if (searchCondition) {
    conditions.push(searchCondition);
  }
  
  // إضافة شروط التصفية
  const filterConditions = buildFilterConditions(params.filters, filterableFields);
  conditions.push(...filterConditions);

  // تجهيز WHERE clause
  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  // حساب العدد الإجمالي
  let countQuery = db.select({ count: count() }).from(table);
  if (whereCondition) {
    countQuery = countQuery.where(whereCondition);
  }
  const [{ count: total }] = await countQuery;

  // بناء استعلام البيانات
  let dataQuery = db.select().from(table);
  
  if (whereCondition) {
    dataQuery = dataQuery.where(whereCondition);
  }

  // إضافة الترتيب
  const orderBy = buildOrderBy(params.sortBy, params.sortOrder, sortableFields);
  if (orderBy) {
    dataQuery = dataQuery.orderBy(orderBy);
  }

  // إضافة التصفح
  const offset = (params.page - 1) * params.pageSize;
  dataQuery = dataQuery.limit(params.pageSize).offset(offset);

  // تنفيذ الاستعلام
  const data = await dataQuery;

  // حساب معلومات التصفح
  const pageCount = Math.ceil(total / params.pageSize);
  const hasNext = params.page < pageCount;
  const hasPrev = params.page > 1;

  return {
    data,
    meta: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      pageCount,
      hasNext,
      hasPrev,
      sort: params.sortBy ? {
        field: params.sortBy,
        order: params.sortOrder
      } : undefined,
      filters: params.filters
    }
  };
}

/**
 * دوال مساعدة للاستجابات
 */
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

export function createErrorResponse(message: string, details?: any) {
  return {
    error: true,
    message,
    details,
    timestamp: new Date().toISOString()
  };
}