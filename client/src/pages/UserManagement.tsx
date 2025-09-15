import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
  Unlock,
  FileText,
  DollarSign,
  MapPin
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

// Form schema for Add Role
const addRoleSchema = z.object({
  code: z.string().min(2, 'رمز الدور يجب أن يكون حرفان على الأقل').max(50, 'رمز الدور طويل جداً'),
  nameAr: z.string().min(1, 'الاسم العربي مطلوب'),
  nameEn: z.string().min(1, 'الاسم الإنجليزي مطلوب'),
  description: z.string().optional(),
  level: z.coerce.number().int().min(1).max(10).default(5),
  isSystemRole: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

type AddRoleForm = z.infer<typeof addRoleSchema>;

export default function UserManagement() {
  const [selectedView, setSelectedView] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<FrontendUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<FrontendRole | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showRolePermissions, setShowRolePermissions] = useState(false);
  // Local state for permissions to prevent race conditions  
  const [localSelectedPermissions, setLocalSelectedPermissions] = useState<Set<string>>(new Set());

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

  // Form for Add Role
  const addRoleForm = useForm<AddRoleForm>({
    resolver: zodResolver(addRoleSchema),
    defaultValues: {
      code: '',
      nameAr: '',
      nameEn: '',
      description: '',
      level: 5,
      isSystemRole: false,
      isActive: true
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

  // Fetch permissions for role management
  const { 
    data: permissionsApiResponse, 
    isLoading: permissionsApiLoading 
  } = useQuery({
    queryKey: ['/api/permissions'],
    enabled: true
  });

  // Fetch role permissions (only when role is selected)
  const { 
    data: rolePermissionsApiResponse, 
    isLoading: rolePermissionsApiLoading 
  } = useQuery({
    queryKey: ['/api/roles', selectedRole?.id, 'permissions'],
    enabled: !!selectedRole?.id
  });

  // Transform API responses to frontend format
  const users: FrontendUser[] = Array.isArray(usersApiResponse) ? usersApiResponse.map(adaptUserToFrontend) : [];
  const roles: FrontendRole[] = Array.isArray(rolesApiResponse) ? rolesApiResponse.map(adaptRoleToFrontend) : [];
  const departments = departmentsApiResponse || [];
  const permissions = Array.isArray(permissionsApiResponse) ? permissionsApiResponse : [];
  const rolePermissions = Array.isArray(rolePermissionsApiResponse) ? rolePermissionsApiResponse : [];
  
  // Initialize local permissions when role permissions are loaded
  useEffect(() => {
    if (rolePermissions.length > 0) {
      const permissionIds = rolePermissions.map(rp => rp.permissionId);
      setLocalSelectedPermissions(new Set(permissionIds));
    }
  }, [rolePermissions]);
  
  // Get assigned permission IDs for selected role (fallback to local state)
  const assignedPermissionIds = Array.from(localSelectedPermissions);

  // Handle permission checkbox changes with local state management
  const handlePermissionChange = (permissionId: string, checked: boolean | "indeterminate") => {
    // Only handle boolean values (ignore indeterminate)
    if (typeof checked !== 'boolean') return;
    
    // Update local state immediately for optimistic UI
    const newPermissions = new Set(localSelectedPermissions);
    if (checked) {
      newPermissions.add(permissionId);
    } else {
      newPermissions.delete(permissionId);
    }
    setLocalSelectedPermissions(newPermissions);
    
    // Send to server
    updateRolePermissionsMutation.mutate({ 
      roleId: selectedRole!.id, 
      permissionIds: Array.from(newPermissions)
    });
  };


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

  // Add Role mutation
  const addRoleMutation = useMutation({
    mutationFn: async (data: AddRoleForm) => {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create role');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء الدور",
        description: "تم إنشاء الدور الجديد بنجاح",
      });
      addRoleForm.reset();
      setShowAddRole(false);
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء الدور",
        variant: "destructive"
      });
    },
  });

  // Update Role Permissions mutation
  const updateRolePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ permissionIds })
      });
      if (!response.ok) throw new Error('Failed to update role permissions');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديث صلاحيات الدور بنجاح",
      });
      // Don't close dialog - keep it open for multi-edit
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/roles', selectedRole?.id, 'permissions'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث صلاحيات الدور",
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

  // Helper functions for role permissions dialog
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      user_management: '#3b82f6',
      application_management: '#10b981',
      financial: '#f59e0b',
      field_operations: '#8b5cf6',
      system: '#ef4444',
      geographic: '#06b6d4'
    };
    return colors[category] || '#6b7280';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      user_management: <Users className="w-4 h-4" />,
      application_management: <FileText className="w-4 h-4" />,
      financial: <DollarSign className="w-4 h-4" />,
      field_operations: <MapPin className="w-4 h-4" />,
      system: <Settings className="w-4 h-4" />,
      geographic: <MapPin className="w-4 h-4" />
    };
    return icons[category] || <Shield className="w-4 h-4" />;
  };

  const getCategoryNameAr = (category: string) => {
    const names: Record<string, string> = {
      user_management: 'إدارة المستخدمين',
      application_management: 'إدارة الطلبات',
      financial: 'الشؤون المالية',
      field_operations: 'العمليات الميدانية',
      system: 'إدارة النظام',
      geographic: 'البيانات الجغرافية'
    };
    return names[category] || 'تصنيف أخر';
  };

  const getScopeColor = (scope: string) => {
    const colors: Record<string, string> = {
      own: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      department: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      region: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      all: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return colors[scope] || 'bg-gray-100 text-gray-800';
  };

  const getScopeNameAr = (scope: string) => {
    const names: Record<string, string> = {
      own: 'شخصي',
      department: 'القسم',
      region: 'المنطقة',
      all: 'الكل'
    };
    return names[scope] || 'غير محدد';
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    إدارة الأدوار
                  </CardTitle>
                  <Dialog open={showAddRole} onOpenChange={setShowAddRole}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-role">
                        <Plus className="w-4 h-4 ml-1" />
                        إضافة دور
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md" dir="rtl">
                      <DialogHeader>
                        <DialogTitle>إضافة دور جديد</DialogTitle>
                      </DialogHeader>
                      <Form {...addRoleForm}>
                        <form onSubmit={addRoleForm.handleSubmit((data) => addRoleMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={addRoleForm.control}
                            name="code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>رمز الدور</FormLabel>
                                <FormControl>
                                  <Input placeholder="مثال: manager" {...field} data-testid="input-role-code" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={addRoleForm.control}
                            name="nameAr"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الاسم العربي</FormLabel>
                                <FormControl>
                                  <Input placeholder="مثال: مدير القسم" {...field} data-testid="input-role-name-ar" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={addRoleForm.control}
                            name="nameEn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الاسم الإنجليزي</FormLabel>
                                <FormControl>
                                  <Input placeholder="مثال: Department Manager" {...field} data-testid="input-role-name-en" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={addRoleForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الوصف</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="وصف مهام ومسؤوليات الدور" {...field} data-testid="input-role-description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={addRoleForm.control}
                            name="level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>مستوى الدور</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" max="10" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 5)} data-testid="input-role-level" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={addRoleForm.control}
                            name="isSystemRole"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-role-system" />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>دور نظام أساسي</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowAddRole(false)}>
                              إلغاء
                            </Button>
                            <Button type="submit" disabled={addRoleMutation.isPending} data-testid="button-submit-role">
                              {addRoleMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الدور'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedRole(role);
                              // Initialize local permissions state when opening dialog
                              setLocalSelectedPermissions(new Set());
                              setShowRolePermissions(true);
                            }}
                            data-testid={`manage-permissions-${role.id}`}
                          >
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

        {/* Role Permissions Dialog */}
        <Dialog open={showRolePermissions} onOpenChange={setShowRolePermissions}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>إدارة صلاحيات الدور: {selectedRole?.nameAr}</DialogTitle>
            </DialogHeader>
            {selectedRole && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">اسم الدور</Label>
                      <p className="font-bold">{selectedRole.nameAr}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">المستوى</Label>
                      <p className="font-bold">{selectedRole.level}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">عدد المستخدمين</Label>
                      <p className="font-bold">{users?.filter(u => u.roles[0]?.id === selectedRole.id).length || 0}</p>
                    </div>
                  </div>
                </div>

                {(permissionsApiLoading || rolePermissionsApiLoading) ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mr-2 text-sm text-muted-foreground">
                      جاري تحميل {permissionsApiLoading ? 'الصلاحيات' : 'صلاحيات الدور'}...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">الصلاحيات المتاحة</h3>
                      <div className="text-sm text-muted-foreground">
                        {assignedPermissionIds.length} من {permissions.length} صلاحية مختارة
                      </div>
                    </div>
                    
                    {/* Group permissions by category */}
                    <div className="space-y-6">
                      {Object.entries(
                        permissions.reduce((acc: Record<string, any[]>, permission: any) => {
                          const category = permission.category || 'other';
                          if (!acc[category]) acc[category] = [];
                          acc[category].push(permission);
                          return acc;
                        }, {})
                      ).map(([category, categoryPermissions]) => (
                        <Card key={category} className="border-l-4" style={{ borderLeftColor: getCategoryColor(category) }}>
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              {getCategoryIcon(category)}
                              {getCategoryNameAr(category)}
                              <Badge variant="secondary" className="mr-auto">
                                {categoryPermissions.filter(p => assignedPermissionIds.includes(p.id)).length} / {categoryPermissions.length}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {categoryPermissions.map((permission: any) => {
                                const isChecked = assignedPermissionIds.includes(permission.id);
                                return (
                                  <div key={permission.id} className="flex items-start space-x-2 space-x-reverse">
                                    <Checkbox
                                      id={`permission-${permission.id}`}
                                      checked={isChecked}
                                      onCheckedChange={(checked: boolean) => 
                                        handlePermissionChange(permission.id, checked)
                                      }
                                      disabled={updateRolePermissionsMutation.isPending}
                                      data-testid={`permission-checkbox-${permission.id}`}
                                    />
                                    <div className="grid gap-1.5 leading-none flex-1">
                                      <label
                                        htmlFor={`permission-${permission.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                      >
                                        {permission.nameAr}
                                      </label>
                                      <p className="text-xs text-muted-foreground">
                                        {permission.description}
                                      </p>
                                      <div className="flex gap-1">
                                        <Badge variant="outline" className="text-xs">
                                          {permission.resource}.{permission.action}
                                        </Badge>
                                        <Badge className={`text-xs ${getScopeColor(permission.scope)}`}>
                                          {getScopeNameAr(permission.scope)}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowRolePermissions(false)}
                    data-testid="button-close-permissions"
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}