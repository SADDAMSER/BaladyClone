import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Users, Building2, UserCog } from "lucide-react";

export default function OrganizationalStructure() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: departments, isLoading: depLoading } = useQuery({
    queryKey: ["/api/departments"],
  });

  const { data: positions, isLoading: posLoading } = useQuery({
    queryKey: ["/api/positions"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const mockDepartments = [
    {
      id: "1",
      name: "إدارة التراخيص والرقابة",
      nameEn: "Licensing and Supervision Department",
      organizationalLevel: 1,
      employeesCount: 25,
      headName: "م. عبدالله الوشلي",
      isActive: true
    },
    {
      id: "2",
      name: "إدارة المساحة والخرائط",
      nameEn: "Surveying and Mapping Department", 
      organizationalLevel: 1,
      employeesCount: 18,
      headName: "م. فاطمة الشامي",
      isActive: true
    },
    {
      id: "3",
      name: "إدارة الشؤون الفنية",
      nameEn: "Technical Affairs Department",
      organizationalLevel: 1,
      employeesCount: 22,
      headName: "م. أحمد الحداد",
      isActive: true
    },
    {
      id: "4",
      name: "إدارة خدمة الجمهور",
      nameEn: "Public Service Department",
      organizationalLevel: 1, 
      employeesCount: 12,
      headName: "أ. نادية السالمي",
      isActive: true
    }
  ];

  const mockPositions = [
    {
      id: "1",
      title: "مدير عام",
      department: "إدارة التراخيص والرقابة",
      level: 1,
      employeesCount: 1,
      permissions: ["إدارة كاملة", "اعتماد التراخيص", "الإشراف العام"]
    },
    {
      id: "2",
      title: "مهندس مساح أول",
      department: "إدارة المساحة والخرائط",
      level: 2,
      employeesCount: 4,
      permissions: ["المسح الميداني", "إعداد التقارير", "مراجعة القرارات"]
    },
    {
      id: "3",
      title: "مفتش فني",
      department: "إدارة الشؤون الفنية",
      level: 3,
      employeesCount: 8,
      permissions: ["فحص المواقع", "التحقق من المطابقة", "إعداد التقارير الفنية"]
    }
  ];

  const mockUsers = [
    {
      id: "1",
      fullName: "م. عبدالله أحمد الوشلي",
      username: "a.alwashli",
      email: "a.alwashli@binaa.gov.ye",
      role: "مدير عام",
      department: "إدارة التراخيص والرقابة",
      isActive: true,
      lastLogin: "2024-01-25 09:30"
    },
    {
      id: "2",
      fullName: "م. فاطمة محمد الشامي", 
      username: "f.alshami",
      email: "f.alshami@binaa.gov.ye",
      role: "رئيس قسم المساحة",
      department: "إدارة المساحة والخرائط",
      isActive: true,
      lastLogin: "2024-01-25 08:45"
    }
  ];

  const displayDepartments = departments || mockDepartments;
  const displayPositions = positions || mockPositions;
  const displayUsers = users || mockUsers;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
              <Table className="text-secondary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-cairo">الهيكل التنظيمي</h1>
              <p className="text-muted-foreground">إدارة المناصب والصلاحيات والموظفين</p>
            </div>
          </div>
          <Button 
            className="flex items-center space-x-2 space-x-reverse"
            data-testid="button-add-employee"
          >
            <Plus size={16} />
            <span>إضافة موظف</span>
          </Button>
        </div>

        <Tabs defaultValue="departments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="departments" data-testid="tab-departments">الإدارات</TabsTrigger>
            <TabsTrigger value="positions" data-testid="tab-positions">المناصب</TabsTrigger>
            <TabsTrigger value="employees" data-testid="tab-employees">الموظفين</TabsTrigger>
          </TabsList>

          <TabsContent value="departments" className="space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="ابحث في الإدارات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                    data-testid="input-search-departments"
                  />
                  <Button variant="outline" data-testid="button-search-departments">
                    <Search size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Departments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayDepartments.map((dept: any) => (
                <Card key={dept.id} className="service-card cursor-pointer" data-testid={`department-card-${dept.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-cairo mb-2">{dept.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{dept.nameEn}</p>
                      </div>
                      <Building2 className="text-primary" size={20} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">رئيس الإدارة:</span>
                        <span className="text-foreground">{dept.headName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">عدد الموظفين:</span>
                        <span className="text-primary font-medium">{dept.employeesCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge variant={dept.isActive ? "default" : "secondary"}>
                          {dept.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                        <Button variant="outline" size="sm" data-testid={`button-manage-${dept.id}`}>
                          إدارة
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="positions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">المناصب والصلاحيات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table data-testid="table-positions">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المسمى الوظيفي</TableHead>
                        <TableHead className="text-right">الإدارة</TableHead>
                        <TableHead className="text-right">المستوى</TableHead>
                        <TableHead className="text-right">عدد الموظفين</TableHead>
                        <TableHead className="text-right">الصلاحيات</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayPositions.map((position: any) => (
                        <TableRow key={position.id} data-testid={`row-position-${position.id}`}>
                          <TableCell className="font-medium">{position.title}</TableCell>
                          <TableCell>{position.department}</TableCell>
                          <TableCell>
                            <Badge variant="outline">مستوى {position.level}</Badge>
                          </TableCell>
                          <TableCell>{position.employeesCount}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {position.permissions.slice(0, 2).map((perm: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {perm}
                                </Badge>
                              ))}
                              {position.permissions.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{position.permissions.length - 2} أخرى
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-edit-position-${position.id}`}
                            >
                              تعديل
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">إدارة الموظفين</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table data-testid="table-employees">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم الكامل</TableHead>
                        <TableHead className="text-right">اسم المستخدم</TableHead>
                        <TableHead className="text-right">البريد الإلكتروني</TableHead>
                        <TableHead className="text-right">المنصب</TableHead>
                        <TableHead className="text-right">الإدارة</TableHead>
                        <TableHead className="text-right">آخر دخول</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayUsers.map((user: any) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">{user.fullName}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>{user.lastLogin}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.isActive ? "default" : "secondary"}
                              data-testid={`badge-user-status-${user.id}`}
                            >
                              {user.isActive ? "نشط" : "غير نشط"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2 space-x-reverse">
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                تعديل
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-permissions-${user.id}`}
                              >
                                الصلاحيات
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
