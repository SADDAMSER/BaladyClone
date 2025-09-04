import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Shield, 
  Key, 
  UserCheck,
  UserX,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Eye,
  Lock,
  Unlock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  department: string;
  position: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  permissions: Permission[];
}

interface UserRole {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  level: number; // 1=admin, 2=manager, 3=employee, 4=citizen
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  nameAr: string;
  module: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  resource: string;
}

export default function UserManagement() {
  const [selectedView, setSelectedView] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for demonstration
  const mockUsers: User[] = [
    {
      id: '1',
      username: 'ahmed.manager',
      email: 'ahmed.manager@yemen.gov.ye',
      firstName: 'أحمد',
      lastName: 'المدير',
      phone: '967-771234567',
      role: {
        id: '2',
        name: 'manager',
        nameAr: 'مدير قسم',
        description: 'مدير قسم مع صلاحيات الإشراف',
        level: 2,
        permissions: []
      },
      department: 'التراخيص',
      position: 'مدير قسم التراخيص',
      isActive: true,
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date('2023-01-15'),
      permissions: []
    },
    {
      id: '2',
      username: 'fatima.employee',
      email: 'fatima.employee@yemen.gov.ye',
      firstName: 'فاطمة',
      lastName: 'الموظفة',
      phone: '967-773456789',
      role: {
        id: '3',
        name: 'employee',
        nameAr: 'موظف',
        description: 'موظف عادي مع صلاحيات محدودة',
        level: 3,
        permissions: []
      },
      department: 'المساحة',
      position: 'مساح أول',
      isActive: true,
      lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000),
      createdAt: new Date('2023-03-20'),
      permissions: []
    },
    {
      id: '3',
      username: 'mohamed.citizen',
      email: 'mohamed.citizen@gmail.com',
      firstName: 'محمد',
      lastName: 'المواطن',
      phone: '967-775678901',
      role: {
        id: '4',
        name: 'citizen',
        nameAr: 'مواطن',
        description: 'مواطن عادي يستخدم الخدمات',
        level: 4,
        permissions: []
      },
      department: 'غير محدد',
      position: 'مواطن',
      isActive: true,
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date('2023-06-10'),
      permissions: []
    }
  ];

  const mockRoles: UserRole[] = [
    {
      id: '1',
      name: 'admin',
      nameAr: 'مدير عام',
      description: 'مدير عام مع صلاحيات كاملة',
      level: 1,
      permissions: []
    },
    {
      id: '2',
      name: 'manager',
      nameAr: 'مدير قسم',
      description: 'مدير قسم مع صلاحيات الإشراف',
      level: 2,
      permissions: []
    },
    {
      id: '3',
      name: 'employee',
      nameAr: 'موظف',
      description: 'موظف عادي مع صلاحيات محدودة',
      level: 3,
      permissions: []
    },
    {
      id: '4',
      name: 'citizen',
      nameAr: 'مواطن',
      description: 'مواطن عادي يستخدم الخدمات',
      level: 4,
      permissions: []
    }
  ];

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users', searchTerm, filterRole, filterDepartment],
    queryFn: () => Promise.resolve(mockUsers),
  });

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/roles'],
    queryFn: () => Promise.resolve(mockRoles),
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      // API call would go here
      return { id, isActive };
    },
    onSuccess: (data) => {
      toast({
        title: "تم التحديث",
        description: `تم ${data.isActive ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم بنجاح`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      // API call would go here
      return id;
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف المستخدم بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.firstName.includes(searchTerm) || 
                         user.lastName.includes(searchTerm) || 
                         user.email.includes(searchTerm) ||
                         user.username.includes(searchTerm);
    const matchesRole = filterRole === 'all' || user.role.id === filterRole;
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
    
    return matchesSearch && matchesRole && matchesDepartment;
  }) || [];

  const getRoleColor = (roleLevel: number) => {
    switch (roleLevel) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastLogin = (lastLogin?: Date) => {
    if (!lastLogin) return 'لم يسجل دخول من قبل';
    
    const now = new Date();
    const diff = now.getTime() - lastLogin.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'متصل الآن';
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  if (usersLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">جاري تحميل بيانات المستخدمين...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">إدارة المستخدمين والصلاحيات</h1>
            <p className="text-gray-600 mt-2">إدارة شاملة للمستخدمين والأدوار والصلاحيات</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" data-testid="import-users">
              <Upload className="w-4 h-4 ml-1" />
              استيراد
            </Button>
            
            <Button variant="outline" size="sm" data-testid="export-users">
              <Download className="w-4 h-4 ml-1" />
              تصدير
            </Button>
            
            <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
              <DialogTrigger asChild>
                <Button data-testid="add-user">
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة مستخدم
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="firstName">الاسم الأول</Label>
                    <Input id="firstName" placeholder="أدخل الاسم الأول" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">الاسم الأخير</Label>
                    <Input id="lastName" placeholder="أدخل الاسم الأخير" />
                  </div>
                  <div>
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" type="email" placeholder="user@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="role">الدور</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الدور" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1" data-testid="save-user">
                      حفظ
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddUser(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">إجمالي المستخدمين</p>
                  <p className="text-2xl font-bold">{users?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">المستخدمين النشطين</p>
                  <p className="text-2xl font-bold">{users?.filter(u => u.isActive).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <UserX className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">المستخدمين المعطلين</p>
                  <p className="text-2xl font-bold">{users?.filter(u => !u.isActive).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">الأدوار</p>
                  <p className="text-2xl font-bold">{roles?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="البحث في المستخدمين..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                    data-testid="search-users"
                  />
                </div>
              </div>
              
              <div className="min-w-48">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="فلتر حسب الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأدوار</SelectItem>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="min-w-48">
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="فلتر حسب القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأقسام</SelectItem>
                    <SelectItem value="التراخيص">التراخيص</SelectItem>
                    <SelectItem value="المساحة">المساحة</SelectItem>
                    <SelectItem value="الاشتراطات">الاشتراطات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" data-testid="users-tab">
              المستخدمين
            </TabsTrigger>
            <TabsTrigger value="roles" data-testid="roles-tab">
              الأدوار
            </TabsTrigger>
            <TabsTrigger value="permissions" data-testid="permissions-tab">
              الصلاحيات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  قائمة المستخدمين ({filteredUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`user-row-${user.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-lg">{user.firstName} {user.lastName}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-sm text-gray-500">{user.position} - {user.department}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <Badge className={getRoleColor(user.role.level)}>
                            {user.role.nameAr}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatLastLogin(user.lastLogin)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserDetails(true);
                            }}
                            data-testid={`view-user-${user.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditUser(true);
                            }}
                            data-testid={`edit-user-${user.id}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserStatus.mutate({ id: user.id, isActive: !user.isActive })}
                            data-testid={`toggle-user-${user.id}`}
                          >
                            {user.isActive ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4 text-green-500" />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser.mutate(user.id)}
                            data-testid={`delete-user-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">لا يوجد مستخدمين مطابقين للبحث</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  إدارة الأدوار
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles?.map((role) => (
                    <Card key={role.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={getRoleColor(role.level)}>
                            مستوى {role.level}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <h3 className="font-bold text-lg mb-2">{role.nameAr}</h3>
                        <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {users?.filter(u => u.role.id === role.id).length || 0} مستخدم
                          </span>
                          <Button variant="outline" size="sm">
                            <Key className="w-4 h-4 ml-1" />
                            الصلاحيات
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  إدارة الصلاحيات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Key className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">إدارة الصلاحيات</h3>
                  <p className="text-gray-500 mb-4">قريباً - نظام إدارة الصلاحيات المتقدم</p>
                  <Button variant="outline">
                    <Settings className="w-4 h-4 ml-1" />
                    إعداد الصلاحيات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Details Modal */}
        <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل المستخدم</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedUser.firstName} {selectedUser.lastName}</h2>
                    <p className="text-gray-600">{selectedUser.position}</p>
                    <Badge className={getRoleColor(selectedUser.role.level)}>
                      {selectedUser.role.nameAr}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">البريد الإلكتروني</Label>
                    <p className="mt-1">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">رقم الهاتف</Label>
                    <p className="mt-1">{selectedUser.phone || 'غير محدد'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">القسم</Label>
                    <p className="mt-1">{selectedUser.department}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">تاريخ الإنشاء</Label>
                    <p className="mt-1">{selectedUser.createdAt.toLocaleDateString('ar-SA')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">آخر تسجيل دخول</Label>
                    <p className="mt-1">{formatLastLogin(selectedUser.lastLogin)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">الحالة</Label>
                    <p className="mt-1">
                      <Badge className={selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {selectedUser.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}