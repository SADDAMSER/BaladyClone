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
import { useToast } from "@/hooks/use-toast";
import EmployeeLogin from "@/employee/components/EmployeeLogin";
import UnifiedSurveyingForm from "@/employee/components/UnifiedSurveyingForm";
import { useLocation } from "wouter";
import { 
  FileText, 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calculator,
  Search,
  Filter,
  Building2,
  Phone,
  AlertCircle,
  LogOut,
  Eye,
  BarChart3,
  TrendingUp,
  Users,
  FileCheck,
  DollarSign,
  Printer
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
  email?: string;
  fees?: string;
  applicationData: {
    governorate?: string;
    district?: string;
    area?: string;
    purpose?: string;
    description?: string;
  };
}

interface ReviewData {
  decision: 'approved' | 'rejected';
  notes: string;
  calculatedFees: number;
  reviewerComments: string;
}

const statusConfig = {
  submitted: { 
    label: "مقدم", 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", 
    icon: <FileText className="h-4 w-4" /> 
  },
  in_review: { 
    label: "قيد المراجعة", 
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", 
    icon: <Clock className="h-4 w-4" /> 
  },
  approved: { 
    label: "معتمد", 
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
    icon: <CheckCircle className="h-4 w-4" /> 
  },
  rejected: { 
    label: "مرفوض", 
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", 
    icon: <XCircle className="h-4 w-4" /> 
  },
  pending_payment: { 
    label: "في انتظار السداد", 
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", 
    icon: <DollarSign className="h-4 w-4" /> 
  },
  completed: { 
    label: "مكتمل", 
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
    icon: <CheckCircle className="h-4 w-4" /> 
  }
};

export default function PublicServiceDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string>("");
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  
  // ✅ PHASE 1: Enhanced Technical Review Tools  
  const [detailedReviewData, setDetailedReviewData] = useState({
    decisionReason: '',
    technicalNotes: '',
    requiredDocuments: [] as string[],
    estimatedProcessingTime: '',
    priorityLevel: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    gisDataRequests: [] as string[],
    followUpActions: [] as string[]
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  
  // Review states
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetails | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData>({
    decision: 'approved',
    notes: '',
    calculatedFees: 0,
    reviewerComments: ''
  });
  
  // Invoice dialog state
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceApplication, setInvoiceApplication] = useState<ApplicationDetails | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Check for existing login on component mount
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

  // Fetch all applications from applications endpoint
  const { data: allApplications, isLoading } = useQuery<ApplicationDetails[]>({
    queryKey: ['/api/applications'],
    queryFn: async () => {
      try {
        // Set authentication token temporarily for the API call
        const originalToken = localStorage.getItem("auth-token");
        const employeeToken = localStorage.getItem("employee_token");
        
        // Use authentication token
        
        // Use employee token for authentication - it's already a valid JWT
        if (employeeToken) {
          localStorage.setItem("auth-token", employeeToken);
        } else {
          console.error('❌ No employee token found!');
          return [];
        }
        
        // Call the applications endpoint to get real applications
        const response = await apiRequest('GET', '/api/applications');
        const result = await response.json();
        
        // API call successful
        
        // Restore original token
        if (originalToken) {
          localStorage.setItem("auth-token", originalToken);
        } else {
          localStorage.removeItem("auth-token");
        }
        
        // Transform the data to match expected format 
        return result?.map((app: any) => {
          // Data is already transformed by the API
          const appData = app.applicationData || {};
          
          const transformedApp = {
            id: app.id,
            applicationNumber: app.applicationNumber || 'غير محدد',
            serviceType: appData.serviceType === 'surveying_decision' ? 'قرار المساحة' : 
                        (appData.serviceType || 'غير محدد'),
            status: app.status || 'submitted',
            currentStage: app.currentStage || 'review',
            submittedAt: app.createdAt,
            applicantName: appData.applicantName || 'غير محدد',
            applicantId: app.applicantId || 'غير محدد',
            contactPhone: appData.contactPhone || 'غير محدد',
            fees: app.fees?.toString() || '50000',
            applicationData: appData
          };
          
          // Data transformation completed
          
          return transformedApp;
        }) || [];
      } catch (error) {
        console.error('Error fetching applications:', error);
        return [];
      }
    },
    enabled: isLoggedIn,
    retry: false,
    refetchOnWindowFocus: false
  });

  // Review application mutation - Updated for Task 1.2 Workflow
  const reviewMutation = useMutation({
    mutationFn: async (data: { applicationId: string; reviewData: ReviewData }) => {
      const originalToken = localStorage.getItem("auth-token");
      localStorage.setItem("auth-token", authToken);
      
      try {
        // First, start workflow if not started
        const workflowResponse = await apiRequest('POST', `/api/workflow/start/${data.applicationId}`, {});
        const workflowData = await workflowResponse.json();
        
        // Then process the public service review via workflow
        const response = await apiRequest('POST', `/api/workflow/public-service-review/${workflowData.data?.instanceId}`, {
          documentVerification: data.reviewData.decision === 'approved' ? 'verified' : 'rejected',
          feeCalculation: data.reviewData.calculatedFees,
          notes: data.reviewData.reviewerComments
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
        title: "تم بنجاح",
        description: reviewData.decision === 'approved' ? "تم اعتماد الطلب وإرسال إشعار للصندوق" : "تم رفض الطلب",
        variant: reviewData.decision === 'approved' ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      setSelectedApplication(null);
      setReviewData({ decision: 'approved', notes: '', calculatedFees: 0, reviewerComments: '' });
      
      // Log workflow transition
      console.log('[WORKFLOW] Public service review completed:', data);
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في معالجة المراجعة. حاول مرة أخرى.",
        variant: "destructive",
      });
      console.error('Review error:', error);
    },
  });

  // Transfer to treasury mutation
  const transferToTreasuryMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('employee_token');
      localStorage.setItem("auth-token", token || '');
      
      try {
        const response = await apiRequest('POST', `/api/applications/${invoiceApplication?.id}/generate-invoice`, {});
        return await response.json();
      } finally {
        localStorage.removeItem("auth-token");
      }
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم ترحيل الطلب إلى الصندوق للسداد",
      });
      setShowInvoiceDialog(false);
      setInvoiceApplication(null);
      setIsTransferring(false);
      // Navigate to treasury
      setLocation('/employee/treasury');
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في ترحيل الطلب إلى الصندوق",
        variant: "destructive",
      });
      setIsTransferring(false);
    },
  });

  const handleReview = () => {
    if (!selectedApplication) return;
    
    if (!reviewData.reviewerComments.trim()) {
      toast({
        title: "مطلوب",
        description: "يجب إضافة تعليق للمراجعة",
        variant: "destructive",
      });
      return;
    }

    // If approved, show invoice dialog after review
    if (reviewData.decision === 'approved') {
      reviewMutation.mutate({
        applicationId: selectedApplication.id,
        reviewData
      }, {
        onSuccess: () => {
          // Show invoice dialog
          setInvoiceApplication(selectedApplication);
          setShowInvoiceDialog(true);
        }
      });
    } else {
      reviewMutation.mutate({
        applicationId: selectedApplication.id,
        reviewData
      });
    }
  };

  const handlePrintInvoice = () => {
    if (!invoiceApplication) return;
    
    // Print the dialog content directly
    setTimeout(() => {
      window.print();
    }, 100);
    
    // After printing, transfer to treasury
    setTimeout(() => {
      setIsTransferring(true);
      transferToTreasuryMutation.mutate();
    }, 1500);
  };

  const calculateFees = (application: ApplicationDetails) => {
    const baseFees = {
      'قرار المساحة': 5000,
      'ترخيص بناء': 15000,
      'ترخيص هدم': 8000,
      'ترخيص ترميم': 10000
    };
    
    const baseAmount = baseFees[application.serviceType as keyof typeof baseFees] || 5000;
    const areaMultiplier = application.applicationData.area ? 
      Math.min(parseInt(application.applicationData.area) / 100, 5) : 1;
    
    return Math.round(baseAmount * areaMultiplier);
  };

  useEffect(() => {
    if (selectedApplication) {
      const calculatedAmount = calculateFees(selectedApplication);
      setReviewData(prev => ({
        ...prev,
        calculatedFees: calculatedAmount
      }));
    }
  }, [selectedApplication]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
  };

  const formatCurrencyDetailed = (amount: number) => {
    return new Intl.NumberFormat('ar-YE', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Filter applications based on search and filters
  const filteredApplications = allApplications?.filter(app => {
    const matchesSearch = !searchTerm || 
      app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicantId.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesService = serviceTypeFilter === 'all' || app.serviceType === serviceTypeFilter;
    
    return matchesSearch && matchesStatus && matchesService;
  }) || [];

  // Calculate statistics
  const stats = {
    total: allApplications?.length || 0,
    submitted: allApplications?.filter(app => app.status === 'submitted').length || 0,
    inReview: allApplications?.filter(app => app.status === 'in_review').length || 0,
    approved: allApplications?.filter(app => app.status === 'approved').length || 0,
    rejected: allApplications?.filter(app => app.status === 'rejected').length || 0,
    pendingPayment: allApplications?.filter(app => app.status === 'pending_payment').length || 0
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
              <Building2 className="h-6 w-6 text-blue-600 ml-2" />
              <span className="text-lg font-semibold">خدمة الجمهور - مراجعة الطلبات</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-xs text-muted-foreground">جميع الطلبات</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">طلبات جديدة</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
              <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.inReview}</div>
              <p className="text-xs text-muted-foreground">قيد المعالجة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">معتمدة</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">تم الاعتماد</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مرفوضة</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">تم الرفض</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">انتظار السداد</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingPayment}</div>
              <p className="text-xs text-muted-foreground">للسداد</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 ml-2" />
              البحث والتصفية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>البحث</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="رقم الطلب، اسم المتقدم، أو رقم الهوية..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                    data-testid="input-search"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>حالة الطلب</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="submitted">مقدم</SelectItem>
                    <SelectItem value="in_review">قيد المراجعة</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                    <SelectItem value="pending_payment">في انتظار السداد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>نوع الخدمة</Label>
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الخدمات</SelectItem>
                    <SelectItem value="قرار المساحة">قرار المساحة</SelectItem>
                    <SelectItem value="ترخيص بناء">ترخيص بناء</SelectItem>
                    <SelectItem value="ترخيص هدم">ترخيص هدم</SelectItem>
                    <SelectItem value="ترخيص ترميم">ترخيص ترميم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setServiceTypeFilter("all");
                  }}
                  className="w-full"
                >
                  إعادة تعيين
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <FileCheck className="h-5 w-5 ml-2" />
                جدول الطلبات ({filteredApplications.length})
              </span>
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
                <p className="text-gray-600 dark:text-gray-400">لا توجد طلبات مطابقة للبحث</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>اسم المستفيد</TableHead>
                      <TableHead>رقم الهوية</TableHead>
                      <TableHead>نوع الخدمة</TableHead>
                      <TableHead>الغرض</TableHead>
                      <TableHead>حالة الطلب</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
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
                        <TableCell>{application.applicantId}</TableCell>
                        <TableCell>{application.serviceType}</TableCell>
                        <TableCell>{application.applicationData.purpose || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusConfig(application.status).color}>
                            <span className="flex items-center">
                              {getStatusConfig(application.status).icon}
                              <span className="mr-1">{getStatusConfig(application.status).label}</span>
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(application.submittedAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedApplication(application)}
                                  data-testid={`button-review-${application.id}`}
                                >
                                  <Eye className="h-4 w-4 ml-1" />
                                  مراجعة
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl" dir="rtl">
                                <DialogHeader>
                                  <DialogTitle>مراجعة الطلب - {application.applicationNumber}</DialogTitle>
                                  <DialogDescription>
                                    قم بمراجعة تفاصيل الطلب وإضافة قرار الاعتماد أو الرفض
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <h4 className="font-semibold">تفاصيل الطلب</h4>
                                    <div className="space-y-2 text-sm">
                                      <div><strong>نوع الخدمة:</strong> {application.serviceType}</div>
                                      <div><strong>اسم المتقدم:</strong> {application.applicantName}</div>
                                      <div><strong>رقم الهوية:</strong> {application.applicantId}</div>
                                      <div><strong>رقم الهاتف:</strong> {application.contactPhone}</div>
                                      {application.applicationData.governorate && (
                                        <div><strong>المحافظة:</strong> {application.applicationData.governorate}</div>
                                      )}
                                      {application.applicationData.district && (
                                        <div><strong>المديرية:</strong> {application.applicationData.district}</div>
                                      )}
                                      <div><strong>تاريخ التقديم:</strong> {formatDate(application.submittedAt)}</div>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <h4 className="font-semibold">مراجعة الطلب</h4>
                                    
                                    <div>
                                      <Label htmlFor="calculated-fees">الرسوم المحسوبة (ريال)</Label>
                                      <div className="flex items-center mt-1">
                                        <Calculator className="h-4 w-4 ml-2 text-gray-400" />
                                        <Input
                                          id="calculated-fees"
                                          type="number"
                                          value={reviewData.calculatedFees}
                                          onChange={(e) => setReviewData(prev => ({
                                            ...prev,
                                            calculatedFees: parseInt(e.target.value) || 0
                                          }))}
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <Label htmlFor="reviewer-comments">تعليقات المراجعة</Label>
                                      <Textarea
                                        id="reviewer-comments"
                                        placeholder="أضف تعليقاتك على الطلب..."
                                        value={reviewData.reviewerComments}
                                        onChange={(e) => setReviewData(prev => ({
                                          ...prev,
                                          reviewerComments: e.target.value
                                        }))}
                                        className="mt-1"
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="notes">ملاحظات إضافية</Label>
                                      <Textarea
                                        id="notes"
                                        placeholder="ملاحظات للمتقدم أو الجهات التالية..."
                                        value={reviewData.notes}
                                        onChange={(e) => setReviewData(prev => ({
                                          ...prev,
                                          notes: e.target.value
                                        }))}
                                        className="mt-1"
                                      />
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                      <Button
                                        onClick={() => {
                                          setReviewData(prev => ({ ...prev, decision: 'approved' }));
                                          handleReview();
                                        }}
                                        className="flex-1"
                                        disabled={reviewMutation.isPending}
                                      >
                                        <CheckCircle className="h-4 w-4 ml-2" />
                                        اعتماد
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => {
                                          setReviewData(prev => ({ ...prev, decision: 'rejected' }));
                                          handleReview();
                                        }}
                                        className="flex-1"
                                        disabled={reviewMutation.isPending}
                                      >
                                        <XCircle className="h-4 w-4 ml-2" />
                                        رفض
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-contact-${application.id}`}
                            >
                              <Phone className="h-4 w-4 ml-1" />
                              اتصال
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Dialog */}
        {/* ✅ ENHANCED PHASE 1: Improved Invoice Dialog */}
        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto print:shadow-none print:max-w-full print:max-h-full" dir="rtl">
            <div className="print:p-0" id="invoice-content">
              {invoiceApplication && (
                <>
                  {/* Dialog Header - Hidden in print */}
                  <div className="print:hidden mb-4">
                    <DialogHeader>
                      <DialogTitle className="text-right">فاتورة سداد - INV-{Date.now().toString().slice(-6)}</DialogTitle>
                      <DialogDescription className="text-right">
                        النموذج الموحد - طلب الإسقاط المساحي مع إشعار السداد
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={handlePrintInvoice}
                        disabled={isTransferring || transferToTreasuryMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-print-invoice"
                      >
                        <Printer className="h-4 w-4 ml-2" />
                        {isTransferring ? 'جاري الترحيل...' : 'طباعة النموذج الموحد'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowInvoiceDialog(false)}
                        disabled={isTransferring || transferToTreasuryMutation.isPending}
                      >
                        إغلاق
                      </Button>
                    </div>
                  </div>

                  {/* Unified Form Content */}
                  <div className="bg-white">
                    <UnifiedSurveyingForm 
                      application={{
                        id: invoiceApplication.id,
                        applicationNumber: invoiceApplication.applicationNumber,
                        applicationData: {
                          applicantName: invoiceApplication.applicantName,
                          applicantId: invoiceApplication.applicantId,
                          phoneNumber: invoiceApplication.contactPhone || '',
                          location: `${invoiceApplication.applicationData?.governorate || ''} - ${invoiceApplication.applicationData?.district || ''}`,
                          area: invoiceApplication.applicationData?.area || '700',
                          purpose: invoiceApplication.serviceType
                        },
                        fees: reviewData.calculatedFees,
                        submittedAt: invoiceApplication.submittedAt
                      }}
                      barcode={`*${invoiceApplication.applicationNumber}*`}
                    />
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
