import { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Settings,
  FileText,
  Users,
  BarChart3,
  Shield,
  Bell,
  Building,
  Map,
  Cog,
  Scale,
  Table,
  ListTodo,
  Zap,
  Brain,
  Archive,
  Search,
  UserCheck,
  Activity,
  ClipboardList,
  HardHat,
  UserCog,
  BookOpen,
  Target,
  TrendingUp
} from "lucide-react";

export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  children?: NavigationItem[];
  badge?: {
    text: string;
    variant: 'info' | 'warning' | 'success' | 'error';
  };
  permissions?: string[];
}

export const navigationConfig: NavigationItem[] = [
  // 1. لوحة التحكم الرئيسية
  {
    id: 'dashboard',
    label: 'لوحة التحكم الرئيسية',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  
  // 2. الطلبات والمعاملات
  {
    id: 'applications',
    label: 'الطلبات والمعاملات',
    icon: ClipboardList,
    badge: { text: '23', variant: 'info' },
    children: [
      { id: 'building-licenses', label: 'تراخيص البناء', icon: Building, path: '/building-licenses', badge: { text: '45', variant: 'info' } },
      { id: 'surveying-decision', label: 'القرار المساحي', icon: Map, path: '/surveying-decision', badge: { text: '23', variant: 'info' } },
      { id: 'apps-track', label: 'تتبع الطلبات', icon: Search, path: '/applications/track' },
      { id: 'apps-pending', label: 'الطلبات المعلقة', icon: FileText, path: '/applications/pending' },
      { id: 'employee-dashboard', label: 'لوحة الموظف', icon: UserCheck, path: '/employee/dashboard' },
      { id: 'apps-history', label: 'سجل الطلبات', icon: Archive, path: '/applications/history' }
    ]
  },

  // 3. العمل الميداني
  {
    id: 'field-work',
    label: 'العمل الميداني',
    icon: HardHat,
    children: [
      { id: 'surveyor-management', label: 'إدارة المساحين', icon: UserCheck, path: '/surveyor-management' },
      { id: 'field-visits', label: 'الزيارات الميدانية', icon: Map, path: '/employee/engineer' },
      { id: 'assistant-manager', label: 'مساعد المدير', icon: UserCog, path: '/employee/assistant-manager' },
      { id: 'department-manager', label: 'مدير القسم', icon: UserCog, path: '/employee/department-manager' },
      { id: 'geographic-data', label: 'البيانات الجغرافية', icon: Map, path: '/geographic-data' }
    ]
  },

  // 4. الإدارة والتنظيم
  {
    id: 'administration',
    label: 'الإدارة والتنظيم',
    icon: UserCog,
    children: [
      { id: 'user-management', label: 'إدارة المستخدمين', icon: Users, path: '/user-management' },
      { id: 'org-structure', label: 'الهيكل التنظيمي', icon: Table, path: '/organizational-structure' },
      { id: 'org-advanced', label: 'الهيكل المتقدم', icon: Table, path: '/advanced-organizational-structure' },
      { id: 'task-management', label: 'إدارة المهام', icon: ListTodo, path: '/task-management' },
      { id: 'permissions', label: 'الصلاحيات', icon: Shield, path: '/permissions' },
      { id: 'lbac-management', label: 'إدارة الصلاحيات المكانية', icon: Shield, path: '/lbac-management' }
    ]
  },

  // 5. النظام والتشريعات
  {
    id: 'system-legislation',
    label: 'النظام والتشريعات',
    icon: BookOpen,
    children: [
      { id: 'legal-system', label: 'النظام القانوني', icon: Scale, path: '/legal-system', badge: { text: '144', variant: 'success' } },
      { id: 'technical-requirements', label: 'الاشتراطات الفنية', icon: Cog, path: '/technical-requirements', badge: { text: '167', variant: 'success' } },
      { id: 'services-catalog', label: 'دليل الخدمات', icon: FileText, path: '/services' },
      { id: 'service-builder', label: 'منشئ الخدمات', icon: Zap, path: '/service-builder' },
      { id: 'smart-search', label: 'البحث الذكي', icon: Search, path: '/smart-search' },
      { id: 'document-archive', label: 'الأرشفة الإلكترونية', icon: Archive, path: '/document-archive' }
    ]
  },

  // 6. التقارير والتحليلات
  {
    id: 'analytics-reports',
    label: 'التقارير والتحليلات',
    icon: TrendingUp,
    children: [
      { id: 'advanced-analytics', label: 'التحليلات المتقدمة', icon: BarChart3, path: '/advanced-analytics' },
      { id: 'monitoring', label: 'مراقبة النظام', icon: Activity, path: '/monitoring' },
      { id: 'reports', label: 'التقارير', icon: FileText, path: '/reports' }
    ]
  }
];

export const findNavigationItemByPath = (path: string): NavigationItem | null => {
  const findInItems = (items: NavigationItem[]): NavigationItem | null => {
    for (const item of items) {
      if (item.path === path) return item;
      if (item.children) {
        const found = findInItems(item.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findInItems(navigationConfig);
};

export const getParentNavigationItem = (path: string): NavigationItem | null => {
  const findParent = (items: NavigationItem[], targetPath: string): NavigationItem | null => {
    for (const item of items) {
      if (item.children) {
        const hasChild = item.children.some(child => child.path === targetPath);
        if (hasChild) return item;
        
        const foundInChildren = findParent(item.children, targetPath);
        if (foundInChildren) return item;
      }
    }
    return null;
  };
  
  return findParent(navigationConfig, path);
};