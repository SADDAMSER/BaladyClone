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
  Search
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
  {
    id: 'dashboard',
    label: 'لوحة التحكم',
    icon: LayoutDashboard,
    path: '/'
  },
  {
    id: 'services',
    label: 'إدارة الخدمات',
    icon: Settings,
    children: [
      { id: 'building-licenses', label: 'تراخيص البناء', icon: Building, path: '/building-licenses' },
      { id: 'surveying-decision', label: 'القرار المساحي', icon: Map, path: '/surveying-decision' },
      { id: 'technical-requirements', label: 'الاشتراطات الفنية', icon: Cog, path: '/technical-requirements' },
      { id: 'legal-system', label: 'النظام القانوني', icon: Scale, path: '/legal-system' },
      { id: 'service-builder', label: 'منشئ الخدمات', icon: Zap, path: '/service-builder' }
    ]
  },
  {
    id: 'applications',
    label: 'الطلبات والمعاملات',
    icon: FileText,
    badge: { text: '12', variant: 'info' },
    children: [
      { id: 'apps-pending', label: 'الطلبات المعلقة', icon: FileText, path: '/applications/pending' },
      { id: 'apps-approved', label: 'الطلبات المعتمدة', icon: FileText, path: '/applications/approved' },
      { id: 'apps-history', label: 'سجل الطلبات', icon: Archive, path: '/applications/history' }
    ]
  },
  {
    id: 'organization',
    label: 'الهيكل التنظيمي',
    icon: Table,
    children: [
      { id: 'org-structure', label: 'الهيكل التنظيمي', icon: Table, path: '/organizational-structure' },
      { id: 'org-advanced', label: 'الهيكل المتقدم', icon: Table, path: '/advanced-organizational-structure' },
      { id: 'task-management', label: 'إدارة المهام', icon: ListTodo, path: '/task-management' }
    ]
  },
  {
    id: 'analytics',
    label: 'التقارير والإحصائيات',
    icon: BarChart3,
    children: [
      { id: 'advanced-analytics', label: 'التحليلات المتقدمة', icon: BarChart3, path: '/advanced-analytics' },
      { id: 'reports', label: 'التقارير', icon: FileText, path: '/reports' }
    ]
  },
  {
    id: 'users',
    label: 'إدارة المستخدمين',
    icon: Users,
    children: [
      { id: 'user-management', label: 'إدارة المستخدمين', icon: Users, path: '/user-management' },
      { id: 'permissions', label: 'الصلاحيات', icon: Shield, path: '/permissions' }
    ]
  },
  {
    id: 'tools',
    label: 'الأدوات المساعدة',
    icon: Brain,
    children: [
      { id: 'smart-search', label: 'البحث الذكي', icon: Search, path: '/smart-search' },
      { id: 'document-archive', label: 'الأرشفة الإلكترونية', icon: Archive, path: '/document-archive' }
    ]
  },
  {
    id: 'settings',
    label: 'إعدادات النظام',
    icon: Settings,
    children: [
      { id: 'general-settings', label: 'الإعدادات العامة', icon: Settings, path: '/settings/general' },
      { id: 'notifications', label: 'إعدادات الإشعارات', icon: Bell, path: '/settings/notifications' }
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