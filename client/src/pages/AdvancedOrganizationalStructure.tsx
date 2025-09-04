import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Users, 
  Settings, 
  Edit3, 
  Trash2, 
  Plus,
  Crown,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';

interface Department {
  id: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  parentId?: string;
  managerId?: string;
  isActive: boolean;
  employeeCount: number;
  children?: Department[];
}

export default function AdvancedOrganizationalStructure() {
  const [selectedView, setSelectedView] = useState('hierarchy');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for demonstration
  const mockData = {
    departments: [
      {
        id: '1',
        nameAr: 'الإدارة العامة',
        nameEn: 'General Management',
        description: 'الإدارة العليا للمؤسسة',
        parentId: undefined,
        managerId: '1',
        isActive: true,
        employeeCount: 25,
        children: [
          {
            id: '2',
            nameAr: 'قسم التراخيص',
            nameEn: 'Licensing Department',
            description: 'إدارة تراخيص البناء',
            parentId: '1',
            managerId: '2',
            isActive: true,
            employeeCount: 15,
            children: []
          },
          {
            id: '3',
            nameAr: 'قسم المساحة',
            nameEn: 'Surveying Department',
            description: 'الأعمال المساحية والجيوديسية',
            parentId: '1',
            managerId: '3',
            isActive: true,
            employeeCount: 12,
            children: []
          }
        ]
      }
    ],
    stats: {
      totalEmployees: 52,
      totalDepartments: 3,
      totalPositions: 8,
      averagePerformance: 94.5,
      budgetUtilization: 87.2
    }
  };

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['/api/organization/structure'],
    queryFn: () => Promise.resolve(mockData),
  });

  const renderDepartmentNode = (department: Department) => (
    <div 
      key={department.id}
      className="bg-white border-2 border-blue-200 rounded-lg p-4 min-w-[200px] cursor-pointer hover:shadow-lg transition-all"
      onClick={() => setSelectedDepartment(department)}
      data-testid={`department-node-${department.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Building2 className="w-5 h-5 text-blue-600" />
        <Badge variant={department.isActive ? 'default' : 'secondary'}>
          {department.isActive ? 'نشط' : 'معطل'}
        </Badge>
      </div>
      
      <h3 className="font-bold text-sm mb-1">{department.nameAr}</h3>
      {department.nameEn && (
        <p className="text-xs text-gray-600 mb-2">{department.nameEn}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {department.employeeCount}
        </span>
        <span className="flex items-center gap-1">
          <Crown className="w-3 h-3" />
          مدير
        </span>
      </div>
    </div>
  );

  const renderOrgChart = (departments: Department[]) => {
    if (!departments || departments.length === 0) return (
      <div className="text-center text-gray-500 py-8">
        لا توجد أقسام متاحة
      </div>
    );
    
    const renderDepartmentHierarchy = (dept: Department, level: number = 0): JSX.Element => (
      <div key={dept.id} className="mb-4">
        <div 
          className="flex items-center gap-2"
          style={{ marginRight: `${level * 20}px` }}
        >
          {renderDepartmentNode(dept)}
        </div>
        {dept.children && dept.children.length > 0 && (
          <div className="mt-4">
            {dept.children.map(child => renderDepartmentHierarchy(child, level + 1))}
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-4">
        {departments.map(dept => renderDepartmentHierarchy(dept))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">جاري تحميل الهيكل التنظيمي...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">نظام الهيكل التنظيمي المتقدم</h1>
            <p className="text-gray-600 mt-2">إدارة شاملة للأقسام والمناصب والموظفين</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button data-testid="add-department">
              <Plus className="w-4 h-4 ml-1" />
              إضافة قسم
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {orgData?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">إجمالي الموظفين</p>
                    <p className="text-2xl font-bold">{orgData.stats.totalEmployees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الأقسام</p>
                    <p className="text-2xl font-bold">{orgData.stats.totalDepartments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Crown className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">المناصب</p>
                    <p className="text-2xl font-bold">{orgData.stats.totalPositions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">متوسط الأداء</p>
                    <p className="text-2xl font-bold">{orgData.stats.averagePerformance}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">استخدام الميزانية</p>
                    <p className="text-2xl font-bold">{orgData.stats.budgetUtilization}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hierarchy" data-testid="hierarchy-view">
              الهيكل الهرمي
            </TabsTrigger>
            <TabsTrigger value="departments" data-testid="departments-view">
              الأقسام
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="analytics-view">
              التحليلات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hierarchy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  المخطط التنظيمي المرئي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4" data-testid="organization-chart">
                  {orgData?.departments && renderOrgChart(orgData.departments)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Departments List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>قائمة الأقسام</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3" data-testid="departments-list">
                      {orgData?.departments?.map((dept) => (
                        <div
                          key={dept.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedDepartment(dept)}
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            <div>
                              <h3 className="font-medium">{dept.nameAr}</h3>
                              <p className="text-sm text-gray-600">{dept.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={dept.isActive ? 'default' : 'secondary'}>
                              {dept.isActive ? 'نشط' : 'معطل'}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {dept.employeeCount} موظف
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Details */}
              <div>
                {selectedDepartment && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        تفاصيل القسم
                        <Button variant="outline" size="sm" data-testid="edit-department">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-bold text-lg">{selectedDepartment.nameAr}</h3>
                        {selectedDepartment.nameEn && (
                          <p className="text-gray-600">{selectedDepartment.nameEn}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{selectedDepartment.employeeCount} موظف</span>
                        </div>
                      </div>
                      
                      {selectedDepartment.description && (
                        <div>
                          <h4 className="font-medium mb-2">الوصف</h4>
                          <p className="text-sm text-gray-600">{selectedDepartment.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>توزيع الموظفين حسب الأقسام</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                    <BarChart3 className="w-12 h-12 mb-2" />
                    <p>رسم بياني لتوزيع الموظفين</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>مؤشرات الأداء</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>معدل الحضور</span>
                      <span className="font-bold text-green-600">94.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>الإنتاجية</span>
                      <span className="font-bold text-blue-600">87.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>رضا الموظفين</span>
                      <span className="font-bold text-purple-600">91.8%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>معدل الدوران</span>
                      <span className="font-bold text-orange-600">3.2%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}