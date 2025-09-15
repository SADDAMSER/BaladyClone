import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERMISSION_CATEGORIES } from "@shared/defaults";
import { Search, Shield, Users, FileText, DollarSign, MapPin, Settings, Eye } from "lucide-react";

interface Permission {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description: string;
  category: string;
  resource: string;
  action: string;
  scope: string;
  isSystemPermission: boolean;
  isActive: boolean;
}

// Category icons mapping
const categoryIcons = {
  user_management: Users,
  application_management: FileText,
  financial: DollarSign,
  field_operations: MapPin,
  system: Settings,
  geographic: MapPin
};

// Scope colors mapping
const scopeColors = {
  own: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  department: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  region: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  all: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

export default function Permissions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedScope, setSelectedScope] = useState<string>("all");

  // Fetch permissions from API
  const { data: permissions = [], isLoading } = useQuery<Permission[]>({
    queryKey: ['/api/permissions'],
    enabled: true
  });

  // Filter permissions
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = 
      permission.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || permission.category === selectedCategory;
    const matchesScope = selectedScope === "all" || permission.scope === selectedScope;

    return matchesSearch && matchesCategory && matchesScope && permission.isActive;
  });

  // Group permissions by category
  const permissionsByCategory = PERMISSION_CATEGORIES.reduce((acc, category) => {
    acc[category.key] = filteredPermissions.filter(p => p.category === category.key);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">جاري تحميل الصلاحيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">إدارة الصلاحيات</h1>
          <p className="text-muted-foreground">
            عرض وإدارة جميع صلاحيات النظام المتاحة
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="البحث في الصلاحيات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              data-testid="input-search-permissions"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-category">
              <SelectValue placeholder="اختر التصنيف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {PERMISSION_CATEGORIES.map((category) => (
                <SelectItem key={category.key} value={category.key}>
                  {category.nameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedScope} onValueChange={setSelectedScope}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-scope">
              <SelectValue placeholder="اختر النطاق" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع النطاقات</SelectItem>
              <SelectItem value="own">شخصي</SelectItem>
              <SelectItem value="department">القسم</SelectItem>
              <SelectItem value="region">المنطقة</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                إجمالي الصلاحيات
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{permissions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                الصلاحيات المفلترة
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredPermissions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                التصنيفات
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{PERMISSION_CATEGORIES.length}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Permissions by Category */}
      <div className="space-y-6">
        {PERMISSION_CATEGORIES.map((category) => {
          const categoryPermissions = permissionsByCategory[category.key] || [];
          if (categoryPermissions.length === 0) return null;

          const Icon = categoryIcons[category.key as keyof typeof categoryIcons] || Shield;

          return (
            <Card key={category.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5" style={{ color: category.color }} />
                  {category.nameAr}
                  <Badge variant="secondary" className="mr-auto">
                    {categoryPermissions.length} صلاحية
                  </Badge>
                </CardTitle>
                <CardDescription>{category.nameEn}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryPermissions.map((permission) => (
                    <Card key={permission.id} className="border-l-4" style={{ borderLeftColor: category.color }}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-start justify-between">
                          <span className="leading-tight">{permission.nameAr}</span>
                          {permission.isSystemPermission && (
                            <Badge variant="destructive" className="text-xs mr-2">
                              نظام
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {permission.nameEn}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {permission.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">
                              {permission.resource}.{permission.action}
                            </Badge>
                            <Badge 
                              className={`text-xs ${scopeColors[permission.scope as keyof typeof scopeColors] || scopeColors.own}`}
                            >
                              {permission.scope === 'own' ? 'شخصي' :
                               permission.scope === 'department' ? 'القسم' :
                               permission.scope === 'region' ? 'المنطقة' : 'الكل'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <code>{permission.code}</code>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPermissions.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد صلاحيات</h3>
            <p className="text-center text-muted-foreground">
              لم يتم العثور على صلاحيات تطابق معايير البحث المحددة.
              <br />
              حاول تغيير مصطلحات البحث أو المرشحات.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}