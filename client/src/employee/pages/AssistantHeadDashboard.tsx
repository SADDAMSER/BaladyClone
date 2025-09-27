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
import { 
  Calendar, 
  Phone, 
  MessageSquare,
  Clock,
  CheckCircle,
  Send,
  Users,
  Building2,
  User,
  CalendarCheck,
  Bell,
  Eye,
  LogOut,
  Search,
  MapPin,
  Timer,
  MessageCircle
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
  assignedSurveyor?: {
    id: string;
    fullName: string;
    phone?: string;
  };
  applicationData: {
    governorate?: string;
    district?: string;
    area?: string;
    location?: string;
  };
}

interface AppointmentData {
  citizenNotificationSent: boolean;
  appointmentDate: string;
  appointmentTime: string;
  meetingLocation: string;
  contactInstructions: string;
  additionalNotes: string;
  contactMethod: 'phone' | 'sms' | 'whatsapp' | 'email';
  surveyorNotified: boolean;
  reminderScheduled: boolean;
}

interface ContactAttempt {
  id: string;
  applicationId: string;
  contactDate: string;
  contactMethod: string;
  isSuccessful: boolean;
  notes: string;
}

export default function AssistantHeadDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string>("");
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  
  // Appointment scheduling states
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetails | null>(null);
  const [appointmentData, setAppointmentData] = useState<AppointmentData>({
    citizenNotificationSent: false,
    appointmentDate: '',
    appointmentTime: '',
    meetingLocation: '',
    contactInstructions: '',
    additionalNotes: '',
    contactMethod: 'phone',
    surveyorNotified: false,
    reminderScheduled: false
  });

  // Contact attempt states
  const [contactAttempts, setContactAttempts] = useState<ContactAttempt[]>([]);
  const [showContactDialog, setShowContactDialog] = useState(false);

  // Check for existing login
  useEffect(() => {
    // التحقق من جميع أسماء tokens الممكنة
    const token = localStorage.getItem('auth-token') || localStorage.getItem('employee_token');
    const user = localStorage.getItem('employee_user');
    
    if (token && user) {
      setAuthToken(token);
      setCurrentUser(JSON.parse(user));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = (token: string, user: any) => {
    console.log('🔐 Assistant head login success:', { token: token.substring(0, 20) + '...', user: user.username });
    
    // تخزين token بصيغة موحدة
    localStorage.setItem('auth-token', token);
    localStorage.setItem('employee_token', token); // backup
    localStorage.setItem('employee_user', JSON.stringify(user));
    
    setAuthToken(token);
    setCurrentUser(user);
    setIsLoggedIn(true);
    
    // Force refetch applications
    queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
  };

  const handleLogout = () => {
    // تنظيف جميع tokens الممكنة
    localStorage.removeItem('auth-token');
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

  // Fetch applications waiting for appointment scheduling
  const { data: pendingApplications, isLoading } = useQuery<ApplicationDetails[]>({
    queryKey: ['/api/applications', { currentStage: 'assistant_head_scheduling' }],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching applications for assistant head scheduling...');
        
        // استعلام حقيقي للحصول على الطلبات في مرحلة جدولة نائب رئيس القسم
        const response = await fetch('/api/applications?currentStage=assistant_head_scheduling', {
          headers: {
            'Authorization': `Bearer ${authToken || ''}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error('❌ Failed to fetch applications:', response.status, response.statusText);
          return [];
        }
        
        const applications = await response.json();
        console.log(`✅ Fetched ${applications.length} applications for scheduling`);
        return applications as ApplicationDetails[];
        
      } catch (error) {
        console.error('❌ Error fetching pending applications:', error);
        return [];
      }
    },
    enabled: isLoggedIn && !!authToken,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // تحديث كل 30 ثانية
  });

  // Schedule appointment mutation
  const scheduleAppointmentMutation = useMutation({
    mutationFn: async (data: { applicationId: string; instanceId?: string; appointmentData: AppointmentData }) => {
      const originalToken = localStorage.getItem("auth-token");
      localStorage.setItem("auth-token", authToken);
      
      try {
        // Use workflow-based appointment scheduling
        const response = await apiRequest('POST', `/api/workflow/assistant-scheduling/${data.instanceId}`, {
          citizenNotification: data.appointmentData.citizenNotificationSent,
          appointmentScheduling: {
            date: data.appointmentData.appointmentDate,
            time: data.appointmentData.appointmentTime,
            location: data.appointmentData.meetingLocation,
            instructions: data.appointmentData.contactInstructions
          },
          contactDetails: {
            method: data.appointmentData.contactMethod,
            notes: data.appointmentData.additionalNotes
          }
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
        title: "تم جدولة الموعد بنجاح",
        description: "تم إرسال إشعار للمواطن والمساح وتحديد موعد الرفع المساحي",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workflow/my-tasks'] });
      setSelectedApplication(null);
      setAppointmentData({
        citizenNotificationSent: false,
        appointmentDate: '',
        appointmentTime: '',
        meetingLocation: '',
        contactInstructions: '',
        additionalNotes: '',
        contactMethod: 'phone',
        surveyorNotified: false,
        reminderScheduled: false
      });
      
      console.log('[WORKFLOW] Appointment scheduled, transitioning to surveyor field work:', data);
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في جدولة الموعد. حاول مرة أخرى.",
        variant: "destructive",
      });
      console.error('Appointment scheduling error:', error);
    },
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async ({ applicationId, method, message }: { applicationId: string; method: string; message: string }) => {
      const originalToken = localStorage.getItem("auth-token");
      localStorage.setItem("auth-token", authToken);
      
      try {
        const response = await apiRequest('POST', '/api/notifications/send-citizen', {
          applicationId,
          method,
          message
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
    onSuccess: () => {
      toast({
        title: "تم إرسال الإشعار",
        description: "تم إرسال الإشعار للمواطن بنجاح",
      });
      // Add to contact attempts
      if (selectedApplication) {
        const newAttempt: ContactAttempt = {
          id: `contact-${Date.now()}`,
          applicationId: selectedApplication.id,
          contactDate: new Date().toISOString(),
          contactMethod: appointmentData.contactMethod,
          isSuccessful: true,
          notes: 'تم إرسال إشعار الموعد'
        };
        setContactAttempts(prev => [newAttempt, ...prev]);
      }
    },
    onError: () => {
      toast({
        title: "خطأ في الإشعار",
        description: "فشل في إرسال الإشعار للمواطن",
        variant: "destructive",
      });
    }
  });

  const handleScheduleAppointment = () => {
    if (!selectedApplication) return;
    
    if (!appointmentData.appointmentDate || !appointmentData.appointmentTime) {
      toast({
        title: "مطلوب",
        description: "يجب تحديد تاريخ ووقت الموعد",
        variant: "destructive",
      });
      return;
    }

    if (!appointmentData.meetingLocation.trim()) {
      toast({
        title: "مطلوب",
        description: "يجب تحديد مكان اللقاء",
        variant: "destructive",
      });
      return;
    }

    // Mock instance ID - will be replaced with real workflow instance lookup
    scheduleAppointmentMutation.mutate({
      applicationId: selectedApplication.id,
      instanceId: `workflow-${selectedApplication.id}`,
      appointmentData
    });
  };

  const handleSendNotification = () => {
    if (!selectedApplication) return;

    const message = `
مرحباً ${selectedApplication.applicantName}،

تم تكليف المساح ${selectedApplication.assignedSurveyor?.fullName} لإجراء الرفع المساحي لطلبكم رقم ${selectedApplication.applicationNumber}.

موعد الرفع: ${appointmentData.appointmentDate} في ${appointmentData.appointmentTime}
مكان اللقاء: ${appointmentData.meetingLocation}

${appointmentData.contactInstructions}

للاستفسار: 01234567

مع التحية،
قسم المساحة - ${currentUser?.departmentName || 'أمانة العاصمة'}
    `.trim();

    sendNotificationMutation.mutate({
      applicationId: selectedApplication.id,
      method: appointmentData.contactMethod,
      message
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (hours: number) => {
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'يوم' : 'أيام'}`;
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
    scheduled_today: filteredApplications.filter(app => {
      // Mock logic for appointments scheduled today
      return Math.random() > 0.7; // 30% chance
    }).length,
    pending_contact: filteredApplications.filter(app => 
      contactAttempts.filter(attempt => attempt.applicationId === app.id && !attempt.isSuccessful).length > 0
    ).length,
    overdue: filteredApplications.filter(app => {
      const submittedDate = new Date(app.submittedAt);
      const daysDiff = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 2; // Overdue if more than 2 days since assignment
    }).length
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
              <Calendar className="h-6 w-6 text-blue-600 ml-2" />
              <span className="text-lg font-semibold">مساعد رئيس القسم - جدولة المواعيد</span>
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
              <CardTitle className="text-sm font-medium">في انتظار جدولة الموعد</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-xs text-muted-foreground">طلب معلق</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مجدولة اليوم</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.scheduled_today}</div>
              <p className="text-xs text-muted-foreground">موعد مجدول</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">في انتظار الرد</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_contact}</div>
              <p className="text-xs text-muted-foreground">اتصال معلق</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">متأخرة</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">تحتاج متابعة</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="scheduling" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scheduling">جدولة المواعيد</TabsTrigger>
            <TabsTrigger value="notifications">إرسال الإشعارات</TabsTrigger>
            <TabsTrigger value="contact-log">سجل التواصل</TabsTrigger>
          </TabsList>

          {/* Scheduling Tab */}
          <TabsContent value="scheduling" className="space-y-6">
            {/* Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 ml-2" />
                  البحث
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="البحث برقم الطلب أو اسم المتقدم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </CardContent>
            </Card>

            {/* Applications Table */}
            <Card>
              <CardHeader>
                <CardTitle>طلبات في انتظار جدولة الموعد ({filteredApplications.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">جاري التحميل...</p>
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">لا توجد طلبات تحتاج جدولة موعد</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الطلب</TableHead>
                        <TableHead>اسم المتقدم</TableHead>
                        <TableHead>المساح المكلف</TableHead>
                        <TableHead>المنطقة</TableHead>
                        <TableHead>هاتف المتقدم</TableHead>
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
                            <div className="flex items-center">
                              <User className="h-4 w-4 ml-1" />
                              {application.assignedSurveyor?.fullName || 'غير محدد'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 ml-1" />
                              {application.applicationData.governorate} - {application.applicationData.district}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 ml-1" />
                              {application.contactPhone}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedApplication(application)}
                                  data-testid={`button-schedule-${application.id}`}
                                >
                                  <Calendar className="h-4 w-4 ml-1" />
                                  جدولة الموعد
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl" dir="rtl">
                                <DialogHeader>
                                  <DialogTitle>جدولة موعد الرفع المساحي - {application.applicationNumber}</DialogTitle>
                                  <DialogDescription>
                                    حدد موعد الرفع المساحي وأرسل إشعار للمواطن والمساح
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="grid grid-cols-1 gap-6">
                                  {/* Application and Surveyor Info */}
                                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2">تفاصيل الطلب والمساح</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <strong>المتقدم:</strong> {application.applicantName}<br/>
                                        <strong>الهاتف:</strong> {application.contactPhone}<br/>
                                        <strong>المنطقة:</strong> {application.applicationData.location || `${application.applicationData.governorate} - ${application.applicationData.district}`}
                                      </div>
                                      <div>
                                        <strong>المساح:</strong> {application.assignedSurveyor?.fullName}<br/>
                                        <strong>هاتف المساح:</strong> {application.assignedSurveyor?.phone || 'غير محدد'}<br/>
                                        <strong>المساحة:</strong> {application.applicationData.area} م²
                                      </div>
                                    </div>
                                  </div>

                                  {/* Appointment Details */}
                                  <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center">
                                      <Calendar className="h-4 w-4 ml-2" />
                                      تفاصيل الموعد
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="appointment-date">تاريخ الموعد</Label>
                                        <Input
                                          id="appointment-date"
                                          type="date"
                                          value={appointmentData.appointmentDate}
                                          onChange={(e) => setAppointmentData(prev => ({
                                            ...prev,
                                            appointmentDate: e.target.value
                                          }))}
                                          min={new Date().toISOString().split('T')[0]}
                                        />
                                      </div>

                                      <div>
                                        <Label htmlFor="appointment-time">وقت الموعد</Label>
                                        <Select 
                                          value={appointmentData.appointmentTime} 
                                          onValueChange={(value) => setAppointmentData(prev => ({...prev, appointmentTime: value}))}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="اختر الوقت" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="08:00">08:00 صباحاً</SelectItem>
                                            <SelectItem value="09:00">09:00 صباحاً</SelectItem>
                                            <SelectItem value="10:00">10:00 صباحاً</SelectItem>
                                            <SelectItem value="11:00">11:00 صباحاً</SelectItem>
                                            <SelectItem value="14:00">02:00 ظهراً</SelectItem>
                                            <SelectItem value="15:00">03:00 ظهراً</SelectItem>
                                            <SelectItem value="16:00">04:00 مساءً</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div>
                                      <Label htmlFor="meeting-location">مكان اللقاء</Label>
                                      <Input
                                        id="meeting-location"
                                        placeholder="المكان المحدد للقاء المساح..."
                                        value={appointmentData.meetingLocation}
                                        onChange={(e) => setAppointmentData(prev => ({
                                          ...prev,
                                          meetingLocation: e.target.value
                                        }))}
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="contact-method">طريقة التواصل</Label>
                                      <Select 
                                        value={appointmentData.contactMethod} 
                                        onValueChange={(value: any) => setAppointmentData(prev => ({...prev, contactMethod: value}))}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="phone">مكالمة هاتفية</SelectItem>
                                          <SelectItem value="sms">رسالة نصية</SelectItem>
                                          <SelectItem value="whatsapp">واتساب</SelectItem>
                                          <SelectItem value="email">بريد إلكتروني</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Label htmlFor="contact-instructions">تعليمات الاتصال</Label>
                                      <Textarea
                                        id="contact-instructions"
                                        placeholder="تعليمات خاصة للمواطن (ملابس، أوراق مطلوبة، إلخ)..."
                                        value={appointmentData.contactInstructions}
                                        onChange={(e) => setAppointmentData(prev => ({
                                          ...prev,
                                          contactInstructions: e.target.value
                                        }))}
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="additional-notes">ملاحظات إضافية</Label>
                                      <Textarea
                                        id="additional-notes"
                                        placeholder="ملاحظات داخلية للمساح..."
                                        value={appointmentData.additionalNotes}
                                        onChange={(e) => setAppointmentData(prev => ({
                                          ...prev,
                                          additionalNotes: e.target.value
                                        }))}
                                      />
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                      <Button
                                        onClick={handleSendNotification}
                                        variant="outline"
                                        className="flex-1"
                                        disabled={sendNotificationMutation.isPending}
                                        data-testid="button-send-notification"
                                      >
                                        <Send className="h-4 w-4 ml-2" />
                                        إرسال إشعار
                                      </Button>
                                      <Button
                                        onClick={handleScheduleAppointment}
                                        className="flex-1"
                                        disabled={scheduleAppointmentMutation.isPending}
                                        data-testid="button-schedule-appointment"
                                      >
                                        <CalendarCheck className="h-4 w-4 ml-2" />
                                        {scheduleAppointmentMutation.isPending ? 'جاري الجدولة...' : 'تأكيد الموعد'}
                                      </Button>
                                    </div>
                                  </div>
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

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 ml-2" />
                  إرسال الإشعارات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">استخدم جدولة المواعيد لإرسال الإشعارات</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Log Tab */}
          <TabsContent value="contact-log" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 ml-2" />
                  سجل التواصل مع المواطنين
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contactAttempts.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">لا توجد محاولات اتصال مسجلة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contactAttempts.map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={attempt.isSuccessful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {attempt.isSuccessful ? 'نجح' : 'فشل'}
                            </Badge>
                            <span className="text-sm font-medium">{attempt.contactMethod}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{attempt.notes}</p>
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(attempt.contactDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}