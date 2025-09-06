import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  Menu,
  Maximize,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminHeaderProps {
  title?: string;
  showBreadcrumb?: boolean;
  actions?: React.ReactNode;
  onMenuClick: () => void;
}

// Mock breadcrumb data based on current route
const getBreadcrumbsFromPath = (path: string): BreadcrumbItem[] => {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'الرئيسية', href: '/' }
  ];

  const pathMap: Record<string, string> = {
    'building-licenses': 'تراخيص البناء',
    'surveying-decision': 'القرار المساحي',
    'technical-requirements': 'الاشتراطات الفنية',
    'legal-system': 'النظام القانوني',
    'organizational-structure': 'الهيكل التنظيمي',
    'advanced-organizational-structure': 'الهيكل التنظيمي المتقدم',
    'task-management': 'إدارة المهام',
    'advanced-analytics': 'التحليلات المتقدمة',
    'user-management': 'إدارة المستخدمين',
    'document-archive': 'الأرشفة الإلكترونية',
    'smart-search': 'البحث الذكي',
    'service-builder': 'منشئ الخدمات',
    'admin': 'لوحة التحكم'
  };

  segments.forEach((segment, index) => {
    const label = pathMap[segment] || segment;
    const href = '/' + segments.slice(0, index + 1).join('/');
    breadcrumbs.push({ label, href });
  });

  return breadcrumbs;
};

export default function AdminHeader({
  title,
  showBreadcrumb = true,
  actions,
  onMenuClick
}: AdminHeaderProps) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');

  const breadcrumbs = getBreadcrumbsFromPath(location);
  const notifications = [
    {
      id: 1,
      title: "طلب جديد",
      message: "تم استلام طلب رخصة بناء جديد",
      time: "منذ 5 دقائق",
      unread: true
    },
    {
      id: 2,
      title: "تحديث النظام",
      message: "تم تحديث نظام الاشتراطات الفنية",
      time: "منذ ساعة",
      unread: true
    },
    {
      id: 3,
      title: "اجتماع مجدول",
      message: "اجتماع مراجعة الطلبات في 3:00 PM",
      time: "منذ ساعتين",
      unread: false
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    // Add theme switching logic here
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
    // Add language switching logic here
  };

  return (
    <header className="bg-background border-b border-border px-4 lg:px-6 h-16 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
          data-testid="mobile-menu-button"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col">
          {title && (
            <h1 className="text-lg font-semibold text-foreground" data-testid="page-title">
              {title}
            </h1>
          )}
          
          {showBreadcrumb && breadcrumbs.length > 1 && (
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="البحث في النظام..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
            data-testid="header-search-input"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Custom Actions */}
        {actions && (
          <div className="flex items-center gap-2 mr-2">
            {actions}
          </div>
        )}

        {/* System Controls */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            data-testid="theme-toggle"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            data-testid="language-toggle"
          >
            <Globe className="h-4 w-4" />
            <span className="ml-1 text-xs">{language.toUpperCase()}</span>
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            data-testid="fullscreen-toggle"
          >
            <Maximize className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative" data-testid="notifications-button">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -left-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80" data-testid="notifications-dropdown">
              <DropdownMenuLabel className="text-center">الإشعارات</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-4">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{notification.title}</span>
                      {notification.unread && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <span className="text-xs text-muted-foreground mt-1">{notification.time}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="user-menu-button">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
                  <AvatarFallback>إد</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" data-testid="user-menu-dropdown">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">مدير النظام</p>
                  <p className="text-xs text-muted-foreground">admin@yemen-platform.gov.ye</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="user-profile-link">
                <User className="mr-2 h-4 w-4" />
                <span>الملف الشخصي</span>
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="user-settings-link">
                <Settings className="mr-2 h-4 w-4" />
                <span>الإعدادات</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600" 
                data-testid="logout-button"
                onClick={() => {
                  // تنظيف البيانات وتسجيل خروج
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('auth_user');
                  window.location.reload();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}