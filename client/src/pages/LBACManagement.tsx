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
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  MapPin, 
  Shield, 
  Users, 
  Key, 
  Clock, 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye,
  EyeOff,
  Check,
  X,
  History,
  Activity,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Settings,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { apiRequest } from '@/lib/queryClient';

// Types for LBAC entities
interface PermissionGeographicConstraint {
  id: string;
  permissionId: string;
  constraintType: 'restrict' | 'allow' | 'conditional';
  constraintLevel: 'governorate' | 'district' | 'subDistrict' | 'neighborhood';
  constraintValue: string;
  isActive: boolean;
  createdAt: string;
  // Expanded data
  permission?: { code: string; nameAr: string; nameEn: string; };
  geographic?: { nameAr: string; nameEn: string; };
}

interface TemporaryPermissionDelegation {
  id: string;
  delegatorId: string;
  delegeeId: string;
  permissionConstraintId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'active' | 'expired' | 'revoked';
  approvedBy?: string;
  approvedAt?: string;
  isActive: boolean;
  createdAt: string;
  // Expanded data
  delegator?: { fullName: string; username: string; };
  delegee?: { fullName: string; username: string; };
  approver?: { fullName: string; username: string; };
}

interface GeographicRoleTemplate {
  id: string;
  templateName: string;
  description?: string;
  applicableLevel: 'governorate' | 'district' | 'subDistrict' | 'neighborhood';
  templatePermissions: string[];
  defaultConstraints: any;
  isActive: boolean;
  createdAt: string;
  // Usage count
  usageCount?: number;
}

interface AssignmentHistory {
  id: string;
  userId: string;
  originalAssignmentId: string;
  changeType: 'created' | 'updated' | 'deleted' | 'transferred';
  previousValues?: any;
  newValues?: any;
  changedBy: string;
  changeReason?: string;
  changedAt: string;
  // Expanded data
  user?: { fullName: string; username: string; };
  changedByUser?: { fullName: string; username: string; };
}

interface AccessAuditLog {
  id: string;
  userId: string;
  requestedResource: string;
  requestedAction: string;
  governorateId?: string;
  districtId?: string;
  subDistrictId?: string;
  neighborhoodId?: string;
  accessGranted: boolean;
  denialReason?: string;
  accessedAt: string;
  // Expanded data
  user?: { fullName: string; username: string; };
  geographic?: { nameAr: string; level: string; };
}

// Form schemas
const constraintSchema = z.object({
  permissionId: z.string().min(1, 'الصلاحية مطلوبة'),
  constraintType: z.enum(['restrict', 'allow', 'conditional'], { 
    errorMap: () => ({ message: 'نوع القيد مطلوب' })
  }),
  constraintLevel: z.enum(['governorate', 'district', 'subDistrict', 'neighborhood'], {
    errorMap: () => ({ message: 'مستوى القيد مطلوب' })
  }),
  constraintValue: z.string().min(1, 'قيمة القيد مطلوبة'),
  isActive: z.boolean().default(true)
});

const delegationSchema = z.object({
  delegatorId: z.string().min(1, 'المفوض مطلوب'),
  delegeeId: z.string().min(1, 'المفوض إليه مطلوب'),
  permissionConstraintId: z.string().min(1, 'قيد الصلاحية مطلوب'),
  startDate: z.date({ required_error: 'تاريخ البداية مطلوب' }),
  endDate: z.date({ required_error: 'تاريخ النهاية مطلوب' }),
  reason: z.string().min(10, 'السبب يجب أن يكون 10 أحرف على الأقل')
});

const roleTemplateSchema = z.object({
  templateName: z.string().min(1, 'اسم القالب مطلوب'),
  description: z.string().optional(),
  applicableLevel: z.enum(['governorate', 'district', 'subDistrict', 'neighborhood'], {
    errorMap: () => ({ message: 'المستوى المطبق مطلوب' })
  }),
  templatePermissions: z.array(z.string()).min(1, 'صلاحية واحدة على الأقل مطلوبة'),
  isActive: z.boolean().default(true)
});

type ConstraintForm = z.infer<typeof constraintSchema>;
type DelegationForm = z.infer<typeof delegationSchema>;
type RoleTemplateForm = z.infer<typeof roleTemplateSchema>;

export default function LBACManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState('constraints');
  const [constraintDialogOpen, setConstraintDialogOpen] = useState(false);
  const [delegationDialogOpen, setDelegationDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<PermissionGeographicConstraint | null>(null);
  const [editingDelegation, setEditingDelegation] = useState<TemporaryPermissionDelegation | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<GeographicRoleTemplate | null>(null);

  // Filters
  const [constraintFilters, setConstraintFilters] = useState({
    constraintType: '',
    constraintLevel: '',
    isActive: ''
  });
  const [delegationFilters, setDelegationFilters] = useState({
    status: '',
    includeExpired: false
  });
  const [auditFilters, setAuditFilters] = useState({
    accessGranted: '',
    governorateId: '',
    districtId: ''
  });

  // Forms
  const constraintForm = useForm<ConstraintForm>({
    resolver: zodResolver(constraintSchema),
    defaultValues: {
      constraintType: 'allow',
      constraintLevel: 'governorate',
      isActive: true
    }
  });

  const delegationForm = useForm<DelegationForm>({
    resolver: zodResolver(delegationSchema)
  });

  const templateForm = useForm<RoleTemplateForm>({
    resolver: zodResolver(roleTemplateSchema),
    defaultValues: {
      applicableLevel: 'governorate',
      templatePermissions: [],
      isActive: true
    }
  });

  // Queries
  const { data: constraints = [], isLoading: constraintsLoading } = useQuery<PermissionGeographicConstraint[]>({
    queryKey: ['/api/lbac/permission-constraints', constraintFilters]
  });

  const { data: delegations = [], isLoading: delegationsLoading } = useQuery<TemporaryPermissionDelegation[]>({
    queryKey: ['/api/lbac/delegations', {
      ...delegationFilters,
      includeExpired: delegationFilters.includeExpired.toString()
    }]
  });

  const { data: roleTemplates = [], isLoading: templatesLoading } = useQuery<GeographicRoleTemplate[]>({
    queryKey: ['/api/lbac/role-templates']
  });

  const { data: assignmentHistory = [], isLoading: historyLoading } = useQuery<AssignmentHistory[]>({
    queryKey: ['/api/lbac/assignment-history']
  });

  const { data: accessAudit = [], isLoading: auditLoading } = useQuery<AccessAuditLog[]>({
    queryKey: ['/api/lbac/access-audit', auditFilters]
  });

  // Helper queries for dropdowns
  const { data: permissions = [] } = useQuery<Array<{id: string; nameAr: string; nameEn: string}>>({
    queryKey: ['/api/permissions']
  });

  const { data: users = [] } = useQuery<Array<{id: string; fullName: string; username: string}>>({
    queryKey: ['/api/users']
  });

  const { data: governorates = [] } = useQuery<Array<{id: string; nameAr: string; nameEn?: string}>>({
    queryKey: ['/api/governorates']
  });

  const { data: districts = [] } = useQuery<Array<{id: string; nameAr: string; nameEn?: string; governorateId: string}>>({
    queryKey: ['/api/districts']
  });

  // Mutations
  const createConstraintMutation = useMutation({
    mutationFn: (data: ConstraintForm) => apiRequest('POST', '/api/lbac/permission-constraints', data),
    onSuccess: () => {
      toast({ title: 'تم إنشاء القيد بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['lbac-constraints'] });
      setConstraintDialogOpen(false);
      constraintForm.reset();
    },
    onError: () => {
      toast({ title: 'فشل في إنشاء القيد', variant: 'destructive' });
    }
  });

  const updateConstraintMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConstraintForm }) => 
      apiRequest('PUT', `/api/lbac/permission-constraints/${id}`, data),
    onSuccess: () => {
      toast({ title: 'تم تحديث القيد بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['lbac-constraints'] });
      setConstraintDialogOpen(false);
      setEditingConstraint(null);
      constraintForm.reset();
    },
    onError: () => {
      toast({ title: 'فشل في تحديث القيد', variant: 'destructive' });
    }
  });

  const deleteConstraintMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/lbac/permission-constraints/${id}`),
    onSuccess: () => {
      toast({ title: 'تم حذف القيد بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['lbac-constraints'] });
    },
    onError: () => {
      toast({ title: 'فشل في حذف القيد', variant: 'destructive' });
    }
  });

  const createDelegationMutation = useMutation({
    mutationFn: (data: DelegationForm) => apiRequest('POST', '/api/lbac/delegations', {
      ...data,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString()
    }),
    onSuccess: () => {
      toast({ title: 'تم إنشاء التفويض بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['lbac-delegations'] });
      setDelegationDialogOpen(false);
      delegationForm.reset();
    },
    onError: () => {
      toast({ title: 'فشل في إنشاء التفويض', variant: 'destructive' });
    }
  });

  const activateDelegationMutation = useMutation({
    mutationFn: ({ id, approvedBy }: { id: string; approvedBy: string }) => 
      apiRequest('POST', `/api/lbac/delegations/${id}/activate`, { approvedBy }),
    onSuccess: () => {
      toast({ title: 'تم تفعيل التفويض بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['lbac-delegations'] });
    },
    onError: () => {
      toast({ title: 'فشل في تفعيل التفويض', variant: 'destructive' });
    }
  });

  const deactivateDelegationMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      apiRequest('POST', `/api/lbac/delegations/${id}/deactivate`, { reason }),
    onSuccess: () => {
      toast({ title: 'تم إلغاء التفويض بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['lbac-delegations'] });
    },
    onError: () => {
      toast({ title: 'فشل في إلغاء التفويض', variant: 'destructive' });
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: RoleTemplateForm) => apiRequest('POST', '/api/lbac/role-templates', data),
    onSuccess: () => {
      toast({ title: 'تم إنشاء القالب بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['lbac-role-templates'] });
      setTemplateDialogOpen(false);
      templateForm.reset();
    },
    onError: () => {
      toast({ title: 'فشل في إنشاء القالب', variant: 'destructive' });
    }
  });

  const applyTemplateMutation = useMutation({
    mutationFn: ({ templateId, userId, targetGeographicId }: { 
      templateId: string; 
      userId: string; 
      targetGeographicId: string; 
    }) => apiRequest('POST', `/api/lbac/role-templates/${templateId}/apply`, { userId, targetGeographicId }),
    onSuccess: () => {
      toast({ title: 'تم تطبيق القالب بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['lbac-assignment-history'] });
    },
    onError: () => {
      toast({ title: 'فشل في تطبيق القالب', variant: 'destructive' });
    }
  });

  // Helper functions
  const handleEditConstraint = (constraint: PermissionGeographicConstraint) => {
    setEditingConstraint(constraint);
    constraintForm.reset({
      permissionId: constraint.permissionId,
      constraintType: constraint.constraintType as any,
      constraintLevel: constraint.constraintLevel as any,
      constraintValue: constraint.constraintValue,
      isActive: constraint.isActive
    });
    setConstraintDialogOpen(true);
  };

  const handleEditDelegation = (delegation: TemporaryPermissionDelegation) => {
    setEditingDelegation(delegation);
    delegationForm.reset({
      delegatorId: delegation.delegatorId,
      delegeeId: delegation.delegeeId,
      permissionConstraintId: delegation.permissionConstraintId,
      startDate: new Date(delegation.startDate),
      endDate: new Date(delegation.endDate),
      reason: delegation.reason
    });
    setDelegationDialogOpen(true);
  };

  const handleEditTemplate = (template: GeographicRoleTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      templateName: template.templateName,
      description: template.description,
      applicableLevel: template.applicableLevel as any,
      templatePermissions: template.templatePermissions,
      isActive: template.isActive
    });
    setTemplateDialogOpen(true);
  };

  const onConstraintSubmit = (data: ConstraintForm) => {
    if (editingConstraint) {
      updateConstraintMutation.mutate({ id: editingConstraint.id, data });
    } else {
      createConstraintMutation.mutate(data);
    }
  };

  const onDelegationSubmit = (data: DelegationForm) => {
    createDelegationMutation.mutate(data);
  };

  const onTemplateSubmit = (data: RoleTemplateForm) => {
    createTemplateMutation.mutate(data);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'expired': return 'outline';
      case 'revoked': return 'destructive';
      default: return 'secondary';
    }
  };

  const getConstraintTypeLabel = (type: string) => {
    switch (type) {
      case 'restrict': return 'تقييد';
      case 'allow': return 'سماح';
      case 'conditional': return 'مشروط';
      default: return type;
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'governorate': return 'محافظة';
      case 'district': return 'مديرية';
      case 'subDistrict': return 'عزلة';
      case 'neighborhood': return 'حي';
      default: return level;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-blue-900">
      <Header />
      
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              إدارة الصلاحيات الجغرافية (LBAC)
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              إدارة شاملة للتحكم بالصلاحيات المبنية على الموقع الجغرافي
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-none lg:inline-flex">
            <TabsTrigger value="constraints" className="flex items-center gap-2" data-testid="tab-constraints">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">قيود الصلاحيات</span>
            </TabsTrigger>
            <TabsTrigger value="delegations" className="flex items-center gap-2" data-testid="tab-delegations">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">التفويضات المؤقتة</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2" data-testid="tab-templates">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">قوالب الأدوار</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">سجل التعيينات</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2" data-testid="tab-audit">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">سجل المراجعة</span>
            </TabsTrigger>
          </TabsList>

          {/* Permission Geographic Constraints Tab */}
          <TabsContent value="constraints" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  قيود الصلاحيات الجغرافية
                </CardTitle>
                <Dialog open={constraintDialogOpen} onOpenChange={setConstraintDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-constraint">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة قيد جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingConstraint ? 'تحديث قيد الصلاحية' : 'إضافة قيد صلاحية جديد'}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...constraintForm}>
                      <form onSubmit={constraintForm.handleSubmit(onConstraintSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={constraintForm.control}
                            name="permissionId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الصلاحية</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-permission">
                                      <SelectValue placeholder="اختر الصلاحية" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {permissions.map((permission: any) => (
                                      <SelectItem key={permission.id} value={permission.id}>
                                        {permission.nameAr || permission.nameEn}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={constraintForm.control}
                            name="constraintType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>نوع القيد</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-constraint-type">
                                      <SelectValue placeholder="اختر نوع القيد" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="allow">سماح</SelectItem>
                                    <SelectItem value="restrict">تقييد</SelectItem>
                                    <SelectItem value="conditional">مشروط</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={constraintForm.control}
                            name="constraintLevel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>مستوى القيد</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-constraint-level">
                                      <SelectValue placeholder="اختر مستوى القيد" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="governorate">محافظة</SelectItem>
                                    <SelectItem value="district">مديرية</SelectItem>
                                    <SelectItem value="subDistrict">عزلة</SelectItem>
                                    <SelectItem value="neighborhood">حي</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={constraintForm.control}
                            name="constraintValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>المنطقة الجغرافية</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-constraint-value">
                                      <SelectValue placeholder="اختر المنطقة" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {governorates.map((gov: any) => (
                                      <SelectItem key={gov.id} value={gov.id}>
                                        {gov.nameAr}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={constraintForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">نشط</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  تفعيل أو إلغاء تفعيل هذا القيد
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-constraint-active"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setConstraintDialogOpen(false)}
                            data-testid="button-cancel-constraint"
                          >
                            إلغاء
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createConstraintMutation.isPending || updateConstraintMutation.isPending}
                            data-testid="button-save-constraint"
                          >
                            {editingConstraint ? 'تحديث' : 'حفظ'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="constraint-type-filter">نوع القيد</Label>
                    <Select value={constraintFilters.constraintType} onValueChange={(value) => 
                      setConstraintFilters(prev => ({ ...prev, constraintType: value }))
                    }>
                      <SelectTrigger data-testid="filter-constraint-type">
                        <SelectValue placeholder="جميع الأنواع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع الأنواع</SelectItem>
                        <SelectItem value="allow">سماح</SelectItem>
                        <SelectItem value="restrict">تقييد</SelectItem>
                        <SelectItem value="conditional">مشروط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="constraint-level-filter">مستوى القيد</Label>
                    <Select value={constraintFilters.constraintLevel} onValueChange={(value) => 
                      setConstraintFilters(prev => ({ ...prev, constraintLevel: value }))
                    }>
                      <SelectTrigger data-testid="filter-constraint-level">
                        <SelectValue placeholder="جميع المستويات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع المستويات</SelectItem>
                        <SelectItem value="governorate">محافظة</SelectItem>
                        <SelectItem value="district">مديرية</SelectItem>
                        <SelectItem value="subDistrict">عزلة</SelectItem>
                        <SelectItem value="neighborhood">حي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="constraint-active-filter">الحالة</Label>
                    <Select value={constraintFilters.isActive} onValueChange={(value) => 
                      setConstraintFilters(prev => ({ ...prev, isActive: value }))
                    }>
                      <SelectTrigger data-testid="filter-constraint-active">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع الحالات</SelectItem>
                        <SelectItem value="true">نشط</SelectItem>
                        <SelectItem value="false">غير نشط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Constraints Table */}
                <div className="overflow-x-auto">
                  {constraintsLoading ? (
                    <div className="text-center py-8">جاري التحميل...</div>
                  ) : constraints.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">لا توجد قيود صلاحيات</div>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-right p-3">الصلاحية</th>
                          <th className="text-right p-3">نوع القيد</th>
                          <th className="text-right p-3">المستوى</th>
                          <th className="text-right p-3">المنطقة</th>
                          <th className="text-right p-3">الحالة</th>
                          <th className="text-right p-3">تاريخ الإنشاء</th>
                          <th className="text-right p-3">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {constraints.map((constraint: PermissionGeographicConstraint) => (
                          <tr key={constraint.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-3" data-testid={`constraint-permission-${constraint.id}`}>
                              {constraint.permission?.nameAr || 'غير محدد'}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" data-testid={`constraint-type-${constraint.id}`}>
                                {getConstraintTypeLabel(constraint.constraintType)}
                              </Badge>
                            </td>
                            <td className="p-3" data-testid={`constraint-level-${constraint.id}`}>
                              {getLevelLabel(constraint.constraintLevel)}
                            </td>
                            <td className="p-3" data-testid={`constraint-value-${constraint.id}`}>
                              {constraint.geographic?.nameAr || 'غير محدد'}
                            </td>
                            <td className="p-3">
                              <Badge variant={constraint.isActive ? "default" : "secondary"} data-testid={`constraint-status-${constraint.id}`}>
                                {constraint.isActive ? 'نشط' : 'غير نشط'}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm text-gray-500" data-testid={`constraint-created-${constraint.id}`}>
                              {new Date(constraint.createdAt).toLocaleDateString('ar')}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditConstraint(constraint)}
                                  data-testid={`button-edit-constraint-${constraint.id}`}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteConstraintMutation.mutate(constraint.id)}
                                  disabled={deleteConstraintMutation.isPending}
                                  data-testid={`button-delete-constraint-${constraint.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Temporary Permission Delegations Tab */}
          <TabsContent value="delegations" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  التفويضات المؤقتة للصلاحيات
                </CardTitle>
                <Dialog open={delegationDialogOpen} onOpenChange={setDelegationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-delegation">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة تفويض جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>إضافة تفويض صلاحية مؤقت</DialogTitle>
                    </DialogHeader>
                    <Form {...delegationForm}>
                      <form onSubmit={delegationForm.handleSubmit(onDelegationSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={delegationForm.control}
                            name="delegatorId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>المفوض (المانح)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-delegator">
                                      <SelectValue placeholder="اختر المفوض" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {users.map((user: any) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.fullName} ({user.username})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={delegationForm.control}
                            name="delegeeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>المفوض إليه (المستقبل)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-delegee">
                                      <SelectValue placeholder="اختر المفوض إليه" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {users.map((user: any) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.fullName} ({user.username})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={delegationForm.control}
                          name="permissionConstraintId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>قيد الصلاحية</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-permission-constraint">
                                    <SelectValue placeholder="اختر قيد الصلاحية" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {constraints.map((constraint: PermissionGeographicConstraint) => (
                                    <SelectItem key={constraint.id} value={constraint.id}>
                                      {constraint.permission?.nameAr} - {getLevelLabel(constraint.constraintLevel)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={delegationForm.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>تاريخ البداية</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-right font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                        data-testid="date-start"
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>اختر تاريخ البداية</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={delegationForm.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>تاريخ النهاية</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-right font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                        data-testid="date-end"
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>اختر تاريخ النهاية</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={delegationForm.control}
                          name="reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>سبب التفويض</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="اكتب سبب التفويض..."
                                  className="resize-none"
                                  {...field}
                                  data-testid="textarea-delegation-reason"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setDelegationDialogOpen(false)}
                            data-testid="button-cancel-delegation"
                          >
                            إلغاء
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createDelegationMutation.isPending}
                            data-testid="button-save-delegation"
                          >
                            حفظ التفويض
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* Delegation Filters */}
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="delegation-status-filter">حالة التفويض</Label>
                    <Select value={delegationFilters.status} onValueChange={(value) => 
                      setDelegationFilters(prev => ({ ...prev, status: value }))
                    }>
                      <SelectTrigger data-testid="filter-delegation-status">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع الحالات</SelectItem>
                        <SelectItem value="pending">في الانتظار</SelectItem>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                        <SelectItem value="revoked">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="include-expired"
                      checked={delegationFilters.includeExpired}
                      onCheckedChange={(checked) => 
                        setDelegationFilters(prev => ({ ...prev, includeExpired: !!checked }))
                      }
                      data-testid="checkbox-include-expired"
                    />
                    <Label htmlFor="include-expired">تضمين المنتهية الصلاحية</Label>
                  </div>
                </div>

                {/* Delegations Table */}
                <div className="overflow-x-auto">
                  {delegationsLoading ? (
                    <div className="text-center py-8">جاري التحميل...</div>
                  ) : delegations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">لا توجد تفويضات</div>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-right p-3">المفوض</th>
                          <th className="text-right p-3">المفوض إليه</th>
                          <th className="text-right p-3">نوع الصلاحية</th>
                          <th className="text-right p-3">فترة التفويض</th>
                          <th className="text-right p-3">الحالة</th>
                          <th className="text-right p-3">الموافق</th>
                          <th className="text-right p-3">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {delegations.map((delegation: TemporaryPermissionDelegation) => (
                          <tr key={delegation.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-3" data-testid={`delegation-delegator-${delegation.id}`}>
                              {delegation.delegator?.fullName || 'غير محدد'}
                            </td>
                            <td className="p-3" data-testid={`delegation-delegee-${delegation.id}`}>
                              {delegation.delegee?.fullName || 'غير محدد'}
                            </td>
                            <td className="p-3 text-sm" data-testid={`delegation-permission-${delegation.id}`}>
                              صلاحية مؤقتة
                            </td>
                            <td className="p-3 text-sm" data-testid={`delegation-period-${delegation.id}`}>
                              {new Date(delegation.startDate).toLocaleDateString('ar')} - {new Date(delegation.endDate).toLocaleDateString('ar')}
                            </td>
                            <td className="p-3">
                              <Badge variant={getStatusBadgeVariant(delegation.status)} data-testid={`delegation-status-${delegation.id}`}>
                                {delegation.status === 'pending' && 'في الانتظار'}
                                {delegation.status === 'active' && 'نشط'}
                                {delegation.status === 'expired' && 'منتهي'}
                                {delegation.status === 'revoked' && 'ملغي'}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm" data-testid={`delegation-approver-${delegation.id}`}>
                              {delegation.approver?.fullName || 'لم تتم الموافقة'}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                {delegation.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => activateDelegationMutation.mutate({ 
                                      id: delegation.id, 
                                      approvedBy: 'current-user-id' // يجب أن يأتي من السياق
                                    })}
                                    disabled={activateDelegationMutation.isPending}
                                    data-testid={`button-activate-delegation-${delegation.id}`}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                {delegation.status === 'active' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deactivateDelegationMutation.mutate({ 
                                      id: delegation.id, 
                                      reason: 'إلغاء يدوي'
                                    })}
                                    disabled={deactivateDelegationMutation.isPending}
                                    data-testid={`button-deactivate-delegation-${delegation.id}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditDelegation(delegation)}
                                  data-testid={`button-edit-delegation-${delegation.id}`}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geographic Role Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  قوالب الأدوار الجغرافية
                </CardTitle>
                <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-template">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة قالب جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate ? 'تحديث قالب الدور' : 'إضافة قالب دور جديد'}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...templateForm}>
                      <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-6">
                        <FormField
                          control={templateForm.control}
                          name="templateName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>اسم القالب</FormLabel>
                              <FormControl>
                                <Input placeholder="مثال: مدير محافظة" {...field} data-testid="input-template-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الوصف (اختياري)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="وصف القالب..."
                                  className="resize-none"
                                  {...field}
                                  data-testid="textarea-template-description"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="applicableLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>المستوى المطبق</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-template-level">
                                    <SelectValue placeholder="اختر المستوى المطبق" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="governorate">محافظة</SelectItem>
                                  <SelectItem value="district">مديرية</SelectItem>
                                  <SelectItem value="subDistrict">عزلة</SelectItem>
                                  <SelectItem value="neighborhood">حي</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="templatePermissions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الصلاحيات</FormLabel>
                              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border rounded-md">
                                {permissions.map((permission: any) => (
                                  <div key={permission.id} className="flex items-center space-x-2 space-x-reverse">
                                    <Checkbox
                                      id={`permission-${permission.id}`}
                                      checked={field.value.includes(permission.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...field.value, permission.id]);
                                        } else {
                                          field.onChange(field.value.filter((id: string) => id !== permission.id));
                                        }
                                      }}
                                      data-testid={`checkbox-permission-${permission.id}`}
                                    />
                                    <Label htmlFor={`permission-${permission.id}`} className="text-sm">
                                      {permission.nameAr || permission.nameEn}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">نشط</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  تفعيل أو إلغاء تفعيل هذا القالب
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-template-active"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setTemplateDialogOpen(false)}
                            data-testid="button-cancel-template"
                          >
                            إلغاء
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createTemplateMutation.isPending}
                            data-testid="button-save-template"
                          >
                            {editingTemplate ? 'تحديث' : 'حفظ'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* Templates Grid */}
                {templatesLoading ? (
                  <div className="text-center py-8">جاري التحميل...</div>
                ) : roleTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">لا توجد قوالب أدوار</div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {roleTemplates.map((template: GeographicRoleTemplate) => (
                      <Card key={template.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg" data-testid={`template-name-${template.id}`}>
                              {template.templateName}
                            </CardTitle>
                            <Badge variant={template.isActive ? "default" : "secondary"}>
                              {template.isActive ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {template.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300" data-testid={`template-description-${template.id}`}>
                              {template.description}
                            </p>
                          )}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">المستوى المطبق:</span>
                              <span data-testid={`template-level-${template.id}`}>
                                {getLevelLabel(template.applicableLevel)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">عدد الصلاحيات:</span>
                              <span data-testid={`template-permissions-count-${template.id}`}>
                                {template.templatePermissions.length}
                              </span>
                            </div>
                            {template.usageCount !== undefined && (
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">مرات الاستخدام:</span>
                                <span data-testid={`template-usage-${template.id}`}>
                                  {template.usageCount}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTemplate(template)}
                              className="flex-1"
                              data-testid={`button-edit-template-${template.id}`}
                            >
                              <Edit3 className="h-4 w-4 ml-1" />
                              تحديث
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                // هنا يمكن إضافة dialog لتطبيق القالب
                                console.log('Apply template:', template.id);
                              }}
                              className="flex-1"
                              data-testid={`button-apply-template-${template.id}`}
                            >
                              <UserCheck className="h-4 w-4 ml-1" />
                              تطبيق
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignment History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  سجل تغييرات التعيينات الجغرافية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {historyLoading ? (
                    <div className="text-center py-8">جاري التحميل...</div>
                  ) : assignmentHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">لا يوجد سجل تغييرات</div>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-right p-3">المستخدم</th>
                          <th className="text-right p-3">نوع التغيير</th>
                          <th className="text-right p-3">تم التغيير بواسطة</th>
                          <th className="text-right p-3">سبب التغيير</th>
                          <th className="text-right p-3">تاريخ التغيير</th>
                          <th className="text-right p-3">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentHistory.map((record: AssignmentHistory) => (
                          <tr key={record.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-3" data-testid={`history-user-${record.id}`}>
                              {record.user?.fullName || 'غير محدد'}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" data-testid={`history-change-type-${record.id}`}>
                                {record.changeType === 'created' && 'إنشاء'}
                                {record.changeType === 'updated' && 'تحديث'}
                                {record.changeType === 'deleted' && 'حذف'}
                                {record.changeType === 'transferred' && 'نقل'}
                              </Badge>
                            </td>
                            <td className="p-3" data-testid={`history-changed-by-${record.id}`}>
                              {record.changedByUser?.fullName || 'غير محدد'}
                            </td>
                            <td className="p-3 text-sm text-gray-600" data-testid={`history-reason-${record.id}`}>
                              {record.changeReason || 'غير محدد'}
                            </td>
                            <td className="p-3 text-sm text-gray-500" data-testid={`history-date-${record.id}`}>
                              {new Date(record.changedAt).toLocaleString('ar')}
                            </td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // عرض تفاصيل التغيير
                                  console.log('View details:', record);
                                }}
                                data-testid={`button-view-history-${record.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Access Audit Log Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  سجل مراجعة الوصول الجغرافي
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Audit Filters */}
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="audit-access-filter">حالة الوصول</Label>
                    <Select value={auditFilters.accessGranted} onValueChange={(value) => 
                      setAuditFilters(prev => ({ ...prev, accessGranted: value }))
                    }>
                      <SelectTrigger data-testid="filter-audit-access">
                        <SelectValue placeholder="جميع المحاولات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع المحاولات</SelectItem>
                        <SelectItem value="true">مسموح</SelectItem>
                        <SelectItem value="false">مرفوض</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="audit-governorate-filter">المحافظة</Label>
                    <Select value={auditFilters.governorateId} onValueChange={(value) => 
                      setAuditFilters(prev => ({ ...prev, governorateId: value }))
                    }>
                      <SelectTrigger data-testid="filter-audit-governorate">
                        <SelectValue placeholder="جميع المحافظات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع المحافظات</SelectItem>
                        {governorates.map((gov: any) => (
                          <SelectItem key={gov.id} value={gov.id}>
                            {gov.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {auditLoading ? (
                    <div className="text-center py-8">جاري التحميل...</div>
                  ) : accessAudit.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">لا يوجد سجل مراجعة</div>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-right p-3">المستخدم</th>
                          <th className="text-right p-3">المورد المطلوب</th>
                          <th className="text-right p-3">الإجراء</th>
                          <th className="text-right p-3">المنطقة</th>
                          <th className="text-right p-3">حالة الوصول</th>
                          <th className="text-right p-3">سبب الرفض</th>
                          <th className="text-right p-3">وقت المحاولة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accessAudit.map((log: AccessAuditLog) => (
                          <tr key={log.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-3" data-testid={`audit-user-${log.id}`}>
                              {log.user?.fullName || 'غير محدد'}
                            </td>
                            <td className="p-3" data-testid={`audit-resource-${log.id}`}>
                              {log.requestedResource}
                            </td>
                            <td className="p-3" data-testid={`audit-action-${log.id}`}>
                              {log.requestedAction}
                            </td>
                            <td className="p-3" data-testid={`audit-location-${log.id}`}>
                              {log.geographic?.nameAr || 'غير محدد'}
                            </td>
                            <td className="p-3">
                              {log.accessGranted ? (
                                <Badge variant="default" className="bg-green-100 text-green-800" data-testid={`audit-access-granted-${log.id}`}>
                                  <CheckCircle className="h-3 w-3 ml-1" />
                                  مسموح
                                </Badge>
                              ) : (
                                <Badge variant="destructive" data-testid={`audit-access-denied-${log.id}`}>
                                  <XCircle className="h-3 w-3 ml-1" />
                                  مرفوض
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-sm text-gray-600" data-testid={`audit-denial-reason-${log.id}`}>
                              {log.denialReason || '-'}
                            </td>
                            <td className="p-3 text-sm text-gray-500" data-testid={`audit-accessed-at-${log.id}`}>
                              {new Date(log.accessedAt).toLocaleString('ar')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}