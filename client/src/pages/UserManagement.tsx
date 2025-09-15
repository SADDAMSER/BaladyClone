import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import { 
  type FrontendUser, 
  type FrontendRole, 
  type FrontendPermission,
  type UserQueryParams,
  adaptUserToFrontend,
  adaptRoleToFrontend,
  adaptPermissionToFrontend
} from '@/types/userManagement';

// Form schema for Add User
const addUserSchema = z.object({
  fullName: z.string().min(1, 'الاسم مطلوب'),
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
  email: z.string().email('بريد إلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  roleId: z.string().min(1, 'الدور مطلوب'),
  departmentId: z.string().optional(),
  positionId: z.string().optional()
});

type AddUserForm = z.infer<typeof addUserSchema>;

export default function UserManagement() {
  const [selectedView, setSelectedView] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<FrontendUser | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for Add User
  const addUserForm = useForm<AddUserForm>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      roleId: '',
      departmentId: '',
      positionId: ''
    }
  });

  // Query parameters for API filtering
  const userQueryParams: UserQueryParams = {
    roleId: filterRole !== 'all' ? filterRole : undefined,
    departmentId: filterDepartment !== 'all' ? filterDepartment : undefined,
    isActive: true
  };

  // Fetch users with real API
  const { 
    data: usersApiResponse, 
    isLoading: usersApiLoading, 
    error: usersApiError 
  } = useQuery({
    queryKey: ['/api/users', userQueryParams],
    enabled: true
  });

  // Fetch roles with real API  
  const { 
    data: rolesApiResponse, 
    isLoading: rolesApiLoading, 
    error: rolesApiError 
  } = useQuery({
    queryKey: ['/api/roles', { isActive: true }],
    enabled: true
  });

  // Fetch departments for filters
  const { 
    data: departmentsApiResponse, 
    isLoading: departmentsApiLoading 
  } = useQuery({
    queryKey: ['/api/departments'],
    enabled: true
  });

  // Transform API responses to frontend format
  const users: FrontendUser[] = Array.isArray(usersApiResponse) ? usersApiResponse.map(adaptUserToFrontend) : [];
  const roles: FrontendRole[] = Array.isArray(rolesApiResponse) ? rolesApiResponse.map(adaptRoleToFrontend) : [];
  const departments = departmentsApiResponse || [];

  const temporaryMockRoles: FrontendRole[] = [
    {
      id: '1',
      code: 'admin',
      nameAr: 'مدير عام',
      nameEn: 'Administrator',
      description: 'مدير عام مع صلاحيات كاملة',
      level: 1,
      isSystemRole: true,
      isActive: true
    },
    {
      id: '2',
      code: 'manager',
      nameAr: 'مدير قسم',
      nameEn: 'Manager',
      description: 'مدير قسم مع صلاحيات الإشراف',
      level: 2,
      isSystemRole: false,
      isActive: true
    },
    {
      id: '3',
      code: 'engineer',
      nameAr: 'مهندس',
      nameEn: 'Engineer',
      description: 'مهندس مع صلاحيات تقنية',
      level: 3,
      isSystemRole: false,
      isActive: true
    },
    {
      id: '4',
      code: 'citizen',
      nameAr: 'مواطن',
      nameEn: 'Citizen',
      description: 'مواطن عادي يستخدم الخدمات',
      level: 4,
      isSystemRole: false,
      isActive: true
    }
  ];

  // Use the API data we already fetched
  const isLoading = usersApiLoading || rolesApiLoading || departmentsApiLoading;

  // Add User mutation
  const addUserMutation = useMutation({
    mutationFn: async (data: AddUserForm) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء المستخدم",
        description: "تم إنشاء المستخدم الجديد بنجاح",
      });
      // Reset form and close dialog
      addUserForm.reset();
      setShowAddUser(false);
      // Invalidate users queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء المستخدم",
        variant: "destructive"
      });
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive })
      });
      if (!response.ok) throw new Error('Failed to update user status');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم التحديث",
        description: `تم ${data.isActive ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم بنجاح`,
      });
      // Invalidate users queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة المستخدم",
        variant: "destructive"
      });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      // Use soft delete by setting isActive to false
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive: false })
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف المستخدم بنجاح",
      });
      // Invalidate users queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في حذف المستخدم",
        variant: "destructive"
      });
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.fullName.includes(searchTerm) || 
                         user.email.includes(searchTerm) ||
                         user.username.includes(searchTerm);
    const matchesRole = filterRole === 'all' || (user.roles.length > 0 && user.roles[0].id === filterRole);
    const matchesDepartment = filterDepartment === 'all' || user.departmentId === filterDepartment;
    
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

  if (isLoading) {
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
                <Form {...addUserForm}>
                  <form onSubmit={addUserForm.handleSubmit((data) => addUserMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={addUserForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم الكامل</FormLabel>
                          <FormControl>
                            <Input placeholder="أدخل الاسم الكامل" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المستخدم</FormLabel>
                          <FormControl>
                            <Input placeholder="أدخل اسم المستخدم" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="user@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة المرور</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="أدخل كلمة المرور" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الدور</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الدور" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roles?.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.nameAr}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 pt-4">
                      <Button 
                        type="submit" 
                        className="flex-1" 
                        disabled={addUserMutation.isPending}
                        data-testid="save-user"
                      >
                        {addUserMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddUser(false)}>
                        إلغاء
                      </Button>
                    </div>
                  </form>
                </Form>
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
                    {Array.isArray(departments) ? departments.map((department: any) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    )) : null}
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
                          {user.fullName.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')}
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-lg">{user.fullName}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-sm text-gray-500">{user.positionTitle} - {user.departmentName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <Badge className={getRoleColor(user.roles[0]?.level || 4)}>
                            {user.roles[0]?.nameAr || 'غير محدد'}
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
                            {users?.filter(u => u.roles[0]?.id === role.id).length || 0} مستخدم
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
                    {selectedUser.fullName.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedUser.fullName}</h2>
                    <p className="text-gray-600">{selectedUser.positionTitle}</p>
                    <Badge className={getRoleColor(selectedUser.roles[0]?.level || 4)}>
                      {selectedUser.roles[0]?.nameAr || 'غير محدد'}
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
                    <p className="mt-1">{selectedUser.phoneNumber || 'غير محدد'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">القسم</Label>
                    <p className="mt-1">{selectedUser.departmentName}</p>
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