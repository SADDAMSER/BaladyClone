import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import EmployeeLogin from "@/employee/components/EmployeeLogin";
import { useLocation } from "wouter";
import { 
  UserCheck, 
  MapPin, 
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  Building2,
  Phone,
  Calendar,
  User,
  Compass,
  FileText,
  Eye,
  LogOut,
  Search,
  Filter,
  TrendingUp,
  Zap
} from "lucide-react";

interface ApplicationDetails {
  id: string;
  applicationNumber: string;
  serviceType: string;
  status: string;
  currentStage: string;
  submittedAt: string;
  applicantName: string;
  applicantId: string;
  contactPhone: string;
  fees?: string;
  applicationData: {
    governorate?: string;
    district?: string;
    area?: string;
    purpose?: string;
    description?: string;
    location?: string;
  };
}

interface Surveyor {
  id: string;
  fullName: string;
  username: string;
  specialization?: string;
  assignedRegion?: string;
  currentWorkload: number;
  maxCapacity: number;
  status: 'available' | 'busy' | 'on_leave';
  averageCompletionTime: number; // in days
}

interface SurveyorAssignment {
  surveyorId: string;
  assignmentNotes: string;
  oldProjectionHandling?: 'convert_datum' | 'reproject_coordinates' | 'field_verification' | 'none';
  projectionNotes?: string;
  priority: 'normal' | 'high' | 'urgent';
  estimatedCompletionDays: number;
}

export default function SectionHeadDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string>("");
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("section_head_assignment");
  
  // Assignment states
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetails | null>(null);
  const [assignmentData, setAssignmentData] = useState<SurveyorAssignment>({
    surveyorId: '',
    assignmentNotes: '',
    oldProjectionHandling: 'none',
    projectionNotes: '',
    priority: 'normal',
    estimatedCompletionDays: 3
  });

  // Check for existing login
  useEffect(() => {
    const token = localStorage.getItem('employee_token');
    const user = localStorage.getItem('employee_user');
    
    if (token && user) {
      setAuthToken(token);
      setCurrentUser(JSON.parse(user));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = (token: string, user: any) => {
    setAuthToken(token);
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('employee_token');
    localStorage.removeItem('employee_user');
    setAuthToken("");
    setCurrentUser(null);
    setIsLoggedIn(false);
    setSelectedApplication(null);
    toast({
      title: "تم تسجيل الخروج",
      description: "تم تسجيل خروجك بنجاح",
    });
  };

  // Fetch applications waiting for surveyor assignment
  const { data: pendingApplications, isLoading } = useQuery<ApplicationDetails[]>({
    queryKey: ['/api/applications', { currentStage: 'assigned' }],
    queryFn: async () => {
      try {
        const originalToken = localStorage.getItem("auth-token");
        localStorage.setItem("auth-token", authToken);
        
        const response = await apiRequest('GET', '/api/applications?currentStage=assigned');
        const result = await response.json();
        
        if (originalToken) {
          localStorage.setItem("auth-token", originalToken);
        } else {
          localStorage.removeItem("auth-token");
        }
        
        return result?.map((app: any) => ({
          id: app.id,
          applicationNumber: app.applicationNumber || 'غير محدد',
          serviceType: app.applicationData?.serviceType === 'surveying_decision' ? 'قرار مساحي' : 'غير محدد',
          status: app.status || 'submitted',
          currentStage: app.currentStage || 'assigned',
          submittedAt: app.createdAt,
          applicantName: app.applicationData?.applicantName || 'غير محدد',
          applicantId: app.applicantId || 'غير محدد',
          contactPhone: app.applicationData?.contactPhone || 'غير محدد',
          fees: app.fees?.toString() || '50000',
          applicationData: app.applicationData || {}
        })) || [];
      } catch (error) {
        console.error('Error fetching pending applications:', error);
        return [];
      }
    },
    enabled: isLoggedIn,
    retry: false,
    refetchOnWindowFocus: false
  });

  // Fetch available surveyors
  const { data: surveyors = [] } = useQuery<Surveyor[]>({
    queryKey: ['/api/users', { role: 'surveyor' }],
    queryFn: async () => {
      try {
        const originalToken = localStorage.getItem("auth-token");
        localStorage.setItem("auth-token", authToken);
        
        // Mock data for now - will be replaced with real API call
        const mockSurveyors: Surveyor[] = [
          {
            id: 'surveyor-1',
            fullName: 'أحمد محمد الحداد',
            username: 'a.haddad',
            specialization: 'مساحة عقارية',
            assignedRegion: 'صنعاء',
            currentWorkload: 2,
            maxCapacity: 5,
            status: 'available',
            averageCompletionTime: 3
          },
          {
            id: 'surveyor-2', 
            fullName: 'فاطمة علي السلامي',
            username: 'f.salami',
            specialization: 'مساحة تفصيلية',
            assignedRegion: 'صنعاء - المدينة',
            currentWorkload: 3,
            maxCapacity: 4,
            status: 'available',
            averageCompletionTime: 4
          },
          {
            id: 'surveyor-3',
            fullName: 'محمد عبدالله القاضي',
            username: 'm.qadhi',
            specialization: 'مساحة هندسية',
            assignedRegion: 'صنعاء - الضاحية',
            currentWorkload: 4,
            maxCapacity: 5,
            status: 'busy',
            averageCompletionTime: 2
          }
        ];
        
        if (originalToken) {
          localStorage.setItem("auth-token", originalToken);
        } else {
          localStorage.removeItem("auth-token");
        }
        
        return mockSurveyors;
      } catch (error) {
        console.error('Error fetching surveyors:', error);
        return [];
      }
    },
    enabled: isLoggedIn
  });

  // Assign surveyor mutation
  const assignSurveyorMutation = useMutation({
    mutationFn: async (data: { applicationId: string; instanceId?: string; assignmentData: SurveyorAssignment }) => {
      const originalToken = localStorage.getItem("auth-token");
      localStorage.setItem("auth-token", authToken);
      
      try {
        // Use workflow-based surveyor assignment
        const response = await apiRequest('POST', `/api/workflow/assign-surveyor/${data.instanceId}`, {
          surveyorId: data.assignmentData.surveyorId,
          notes: data.assignmentData.assignmentNotes,
          oldProjectionHandling: data.assignmentData.oldProjectionHandling,
          projectionNotes: data.assignmentData.projectionNotes,
          priority: data.assignmentData.priority,
          estimatedCompletionDays: data.assignmentData.estimatedCompletionDays
        });
        return await response.json();
      } finally {
        if (originalToken) {
          localStorage.setItem("auth-token", originalToken);
        } else {
          localStorage.removeItem("auth-token");
        }
      }
    },
    onSuccess: (data) => {
      toast({
        title: "تم تكليف المساح بنجاح",
        description: "تم تعيين المساح وإرسال إشعار لمساعد رئيس القسم لتحديد الموعد",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workflow/my-tasks'] });
      setSelectedApplication(null);
      setAssignmentData({
        surveyorId: '',
        assignmentNotes: '',
        oldProjectionHandling: 'none',
        projectionNotes: '',
        priority: 'normal',
        estimatedCompletionDays: 3
      });
      
      console.log('[WORKFLOW] Surveyor assigned, transitioning to assistant scheduling:', data);
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في تكليف المساح. حاول مرة أخرى.",
        variant: "destructive",
      });
      console.error('Surveyor assignment error:', error);
    },
  });

  const handleAssignSurveyor = () => {
    if (!selectedApplication) return;
    
    if (!assignmentData.surveyorId) {
      toast({
        title: "مطلوب",
        description: "يجب اختيار مساح للتكليف",
        variant: "destructive",
      });
      return;
    }

    if (!assignmentData.assignmentNotes.trim()) {
      toast({
        title: "مطلوب",
        description: "يجب إضافة ملاحظات التكليف",
        variant: "destructive",
      });
      return;
    }

    // Mock instance ID - will be replaced with real workflow instance lookup
    assignSurveyorMutation.mutate({
      applicationId: selectedApplication.id,
      instanceId: `workflow-${selectedApplication.id}`,
      assignmentData
    });
  };

  const getSurveyorWorkloadColor = (workload: number, capacity: number) => {
    const percentage = (workload / capacity) * 100;
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSurveyorStatusBadge = (status: string) => {
    const config = {
      available: { label: 'متاح', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      busy: { label: 'مشغول', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      on_leave: { label: 'في إجازة', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
    };
    return config[status as keyof typeof config] || config.available;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter applications
  const filteredApplications = pendingApplications?.filter(app => {
    const matchesSearch = !searchTerm || 
      app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicantId.includes(searchTerm);
    return matchesSearch;
  }) || [];

  // Calculate statistics
  const stats = {
    total: pendingApplications?.length || 0,
    high_priority: filteredApplications.filter(app => app.applicationData.priority === 'high').length,
    old_projection: filteredApplications.filter(app => app.applicationData.hasOldProjection === true).length,
    available_surveyors: surveyors.filter(s => s.status === 'available').length
  };

  // Show login screen if not authenticated
  if (!isLoggedIn) {
    return <EmployeeLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Compass className="h-6 w-6 text-blue-600 ml-2" />
              <span className="text-lg font-semibold">رئيس قسم المساحة - تكليف المساحين</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                مرحباً، {currentUser?.fullName || currentUser?.username}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 ml-2" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">طلبات في انتظار التكليف</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-xs text-muted-foreground">تحتاج تكليف مساح</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">أولوية عالية</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.high_priority}</div>
              <p className="text-xs text-muted-foreground">طلبات مستعجلة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إسقاط قديم</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.old_projection}</div>
              <p className="text-xs text-muted-foreground">تحتاج معالجة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مساحون متاحون</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.available_surveyors}</div>
              <p className="text-xs text-muted-foreground">من أصل {surveyors.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">الطلبات المعلقة</TabsTrigger>
            <TabsTrigger value="surveyors">إدارة المساحين</TabsTrigger>
            <TabsTrigger value="statistics">إحصائيات الأداء</TabsTrigger>
          </TabsList>

          {/* Pending Applications Tab */}
          <TabsContent value="pending" className="space-y-6">
            {/* Search and Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 ml-2" />
                  البحث والتصفية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Input
                    placeholder="البحث برقم الطلب أو اسم المتقدم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                    data-testid="input-search"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                  >
                    إعادة تعيين
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Applications Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>طلبات في انتظار تكليف المساح ({filteredApplications.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">جاري تحميل الطلبات...</p>
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">لا توجد طلبات تحتاج تكليف مساح</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الطلب</TableHead>
                        <TableHead>اسم المتقدم</TableHead>
                        <TableHead>المنطقة</TableHead>
                        <TableHead>تاريخ الطلب</TableHead>
                        <TableHead>الأولوية</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium">
                            {application.applicationNumber}
                          </TableCell>
                          <TableCell>{application.applicantName}</TableCell>
                          <TableCell>
                            {application.applicationData.governorate || 'غير محدد'} - 
                            {application.applicationData.district || 'غير محدد'}
                          </TableCell>
                          <TableCell>{formatDate(application.submittedAt)}</TableCell>
                          <TableCell>
                            <Badge className={
                              application.applicationData.priority === 'high' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-blue-100 text-blue-800'
                            }>
                              {application.applicationData.priority === 'high' ? 'عالية' : 'عادية'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedApplication(application)}
                                  data-testid={`button-assign-${application.id}`}
                                >
                                  <UserCheck className="h-4 w-4 ml-1" />
                                  تكليف مساح
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
                                <DialogHeader>
                                  <DialogTitle>تكليف مساح - {application.applicationNumber}</DialogTitle>
                                  <DialogDescription>
                                    اختر المساح المناسب وحدد تفاصيل التكليف
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Application Details */}
                                  <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center">
                                      <Building2 className="h-4 w-4 ml-2" />
                                      تفاصيل الطلب
                                    </h4>
                                    <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                      <div><strong>نوع الخدمة:</strong> {application.serviceType}</div>
                                      <div><strong>اسم المتقدم:</strong> {application.applicantName}</div>
                                      <div><strong>رقم الهوية:</strong> {application.applicantId}</div>
                                      <div><strong>رقم الهاتف:</strong> {application.contactPhone}</div>
                                      <div><strong>المنطقة:</strong> {application.applicationData.governorate} - {application.applicationData.district}</div>
                                      <div><strong>المساحة:</strong> {application.applicationData.area} متر مربع</div>
                                    </div>

                                    {/* Surveyor Assignment Form */}
                                    <div className="space-y-4">
                                      <h4 className="font-semibold flex items-center">
                                        <UserCheck className="h-4 w-4 ml-2" />
                                        تفاصيل التكليف
                                      </h4>
                                      
                                      <div>
                                        <Label htmlFor="surveyor-select">المساح المكلف</Label>
                                        <Select 
                                          value={assignmentData.surveyorId} 
                                          onValueChange={(value) => setAssignmentData(prev => ({...prev, surveyorId: value}))}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="اختر المساح" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {surveyors.map((surveyor) => (
                                              <SelectItem key={surveyor.id} value={surveyor.id}>
                                                <div className="flex items-center justify-between w-full">
                                                  <span>{surveyor.fullName}</span>
                                                  <span className={`text-xs ${getSurveyorWorkloadColor(surveyor.currentWorkload, surveyor.maxCapacity)}`}>
                                                    ({surveyor.currentWorkload}/{surveyor.maxCapacity})
                                                  </span>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label htmlFor="priority">أولوية التكليف</Label>
                                        <Select 
                                          value={assignmentData.priority} 
                                          onValueChange={(value: any) => setAssignmentData(prev => ({...prev, priority: value}))}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="normal">عادية</SelectItem>
                                            <SelectItem value="high">عالية</SelectItem>
                                            <SelectItem value="urgent">مستعجلة</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label htmlFor="old-projection">معالجة الإسقاط القديم</Label>
                                        <Select 
                                          value={assignmentData.oldProjectionHandling} 
                                          onValueChange={(value: any) => setAssignmentData(prev => ({...prev, oldProjectionHandling: value}))}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">لا يوجد إسقاط قديم</SelectItem>
                                            <SelectItem value="convert_datum">تحويل النظام المرجعي</SelectItem>
                                            <SelectItem value="reproject_coordinates">إعادة إسقاط الإحداثيات</SelectItem>
                                            <SelectItem value="field_verification">التحقق الميداني</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {assignmentData.oldProjectionHandling !== 'none' && (
                                        <div>
                                          <Label htmlFor="projection-notes">ملاحظات الإسقاط</Label>
                                          <Textarea
                                            id="projection-notes"
                                            placeholder="تفاصيل معالجة الإسقاط القديم..."
                                            value={assignmentData.projectionNotes}
                                            onChange={(e) => setAssignmentData(prev => ({
                                              ...prev,
                                              projectionNotes: e.target.value
                                            }))}
                                          />
                                        </div>
                                      )}

                                      <div>
                                        <Label htmlFor="completion-days">المدة المتوقعة (أيام)</Label>
                                        <Input
                                          id="completion-days"
                                          type="number"
                                          min="1"
                                          max="14"
                                          value={assignmentData.estimatedCompletionDays}
                                          onChange={(e) => setAssignmentData(prev => ({
                                            ...prev,
                                            estimatedCompletionDays: parseInt(e.target.value) || 3
                                          }))}
                                        />
                                      </div>

                                      <div>
                                        <Label htmlFor="assignment-notes">ملاحظات التكليف</Label>
                                        <Textarea
                                          id="assignment-notes"
                                          placeholder="تعليمات وملاحظات للمساح..."
                                          value={assignmentData.assignmentNotes}
                                          onChange={(e) => setAssignmentData(prev => ({
                                            ...prev,
                                            assignmentNotes: e.target.value
                                          }))}
                                        />
                                      </div>

                                      <Button
                                        onClick={handleAssignSurveyor}
                                        className="w-full"
                                        disabled={assignSurveyorMutation.isPending}
                                        data-testid="button-confirm-assignment"
                                      >
                                        <UserCheck className="h-4 w-4 ml-2" />
                                        {assignSurveyorMutation.isPending ? 'جاري التكليف...' : 'تأكيد التكليف'}
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Selected Surveyor Details */}
                                  {assignmentData.surveyorId && (
                                    <div className="space-y-4">
                                      <h4 className="font-semibold flex items-center">
                                        <User className="h-4 w-4 ml-2" />
                                        تفاصيل المساح المختار
                                      </h4>
                                      {(() => {
                                        const selectedSurveyor = surveyors.find(s => s.id === assignmentData.surveyorId);
                                        return selectedSurveyor && (
                                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                            <div className="space-y-2 text-sm">
                                              <div><strong>الاسم:</strong> {selectedSurveyor.fullName}</div>
                                              <div><strong>التخصص:</strong> {selectedSurveyor.specialization}</div>
                                              <div><strong>المنطقة المسؤول عنها:</strong> {selectedSurveyor.assignedRegion}</div>
                                              <div className="flex items-center gap-2">
                                                <strong>الحالة:</strong>
                                                <Badge className={getSurveyorStatusBadge(selectedSurveyor.status).color}>
                                                  {getSurveyorStatusBadge(selectedSurveyor.status).label}
                                                </Badge>
                                              </div>
                                              <div>
                                                <strong>عبء العمل الحالي:</strong>
                                                <span className={`ml-2 ${getSurveyorWorkloadColor(selectedSurveyor.currentWorkload, selectedSurveyor.maxCapacity)}`}>
                                                  {selectedSurveyor.currentWorkload} من {selectedSurveyor.maxCapacity}
                                                </span>
                                              </div>
                                              <div><strong>متوسط وقت الإنجاز:</strong> {selectedSurveyor.averageCompletionTime} أيام</div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Surveyors Management Tab */}
          <TabsContent value="surveyors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 ml-2" />
                  إدارة المساحين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {surveyors.map((surveyor) => (
                    <Card key={surveyor.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{surveyor.fullName}</h4>
                          <Badge className={getSurveyorStatusBadge(surveyor.status).color}>
                            {getSurveyorStatusBadge(surveyor.status).label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{surveyor.specialization}</p>
                        <p className="text-sm text-gray-600">{surveyor.assignedRegion}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span>عبء العمل:</span>
                          <span className={getSurveyorWorkloadColor(surveyor.currentWorkload, surveyor.maxCapacity)}>
                            {surveyor.currentWorkload}/{surveyor.maxCapacity}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(surveyor.currentWorkload / surveyor.maxCapacity) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 ml-2" />
                  إحصائيات الأداء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">سيتم إضافة تقارير الأداء قريباً</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}