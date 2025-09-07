import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import EmployeeLogin from "@/employee/components/EmployeeLogin";
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
  Receipt,
  CreditCard,
  AlertTriangle,
  Bell,
  FileIcon,
  Download
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
  paymentStatus?: 'pending' | 'paid' | 'overdue';
  paymentDate?: string;
  invoiceNumber?: string;
  applicationData: {
    governorate?: string;
    district?: string;
    area?: string;
    purpose?: string;
    description?: string;
  };
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

const paymentStatusConfig = {
  pending: { 
    label: "في انتظار السداد", 
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", 
    icon: <Clock className="h-4 w-4" /> 
  },
  paid: { 
    label: "مدفوع", 
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
    icon: <CheckCircle className="h-4 w-4" /> 
  },
  overdue: { 
    label: "متأخر", 
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", 
    icon: <AlertTriangle className="h-4 w-4" /> 
  }
};

export default function TreasuryDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string>("");
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending_payment");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  
  // Selected application for payment actions
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetails | null>(null);

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

  // Fetch all applications with payment focus
  const { data: allApplications, isLoading } = useQuery<ApplicationDetails[]>({
    queryKey: ['/api/treasury-applications'],
    queryFn: async () => {
      // Mock applications with payment data
      const mockApplications: ApplicationDetails[] = [
        {
          id: 'treasury-1',
          applicationNumber: 'APP-2025-297204542',
          serviceType: 'إصدار تقرير مساحي',
          status: 'pending_payment',
          currentStage: 'payment',
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
          applicantName: 'صدام حسين حسين السراجي',
          applicantId: '778774772',
          contactPhone: '777123456',
          fees: '57000',
          paymentStatus: 'pending',
          invoiceNumber: 'INV-711220912',
          applicationData: {
            governorate: 'صنعاء',
            district: 'شعوب',
            purpose: 'عن نفسي',
            area: '700'
          }
        },
        {
          id: 'treasury-2',
          applicationNumber: 'APP-2025-123456',
          serviceType: 'ترخيص بناء',
          status: 'pending_payment',
          currentStage: 'payment',
          submittedAt: new Date(Date.now() - 172800000).toISOString(),
          applicantName: 'أحمد محمد علي',
          applicantId: '1234567890',
          contactPhone: '777987654',
          fees: '85000',
          paymentStatus: 'overdue',
          invoiceNumber: 'INV-711220913',
          applicationData: {
            governorate: 'عدن',
            district: 'كريتر',
            purpose: 'بناء تجاري',
            area: '500'
          }
        },
        {
          id: 'treasury-3',
          applicationNumber: 'APP-2025-789012',
          serviceType: 'قرار المساحة',
          status: 'completed',
          currentStage: 'completed',
          submittedAt: new Date(Date.now() - 259200000).toISOString(),
          applicantName: 'فاطمة حسن أحمد',
          applicantId: '9876543210',
          contactPhone: '777555555',
          fees: '45000',
          paymentStatus: 'paid',
          paymentDate: new Date(Date.now() - 86400000).toISOString(),
          invoiceNumber: 'INV-711220914',
          applicationData: {
            governorate: 'تعز',
            district: 'صالة',
            purpose: 'تسوية أوضاع',
            area: '300'
          }
        }
      ];
      
      return mockApplications;
    },
    enabled: isLoggedIn,
    retry: false,
    refetchOnWindowFocus: false
  });

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async (data: { applicationId: string; paymentMethod: string; notes?: string }) => {
      // Mock API call - في التطبيق الحقيقي سيتم استدعاء API للسداد
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, paymentId: 'PAY-' + Date.now() };
    },
    onSuccess: () => {
      toast({
        title: "تم تأكيد السداد",
        description: "تم تأكيد سداد الطلب بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/treasury-applications'] });
      setSelectedApplication(null);
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تأكيد السداد. حاول مرة أخرى.",
        variant: "destructive",
      });
    },
  });

  const handleViewInvoice = (application: ApplicationDetails) => {
    setLocation(`/employee/invoice/${application.id}`);
  };

  const handleConfirmPayment = (application: ApplicationDetails) => {
    confirmPaymentMutation.mutate({
      applicationId: application.id,
      paymentMethod: 'cash',
      notes: 'تم السداد نقداً في الصندوق'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseInt(amount) : amount;
    return new Intl.NumberFormat('ar-YE', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
  };

  const getPaymentStatusConfig = (status: string) => {
    return paymentStatusConfig[status as keyof typeof paymentStatusConfig] || paymentStatusConfig.pending;
  };

  // Filter applications based on search and filters
  const filteredApplications = allApplications?.filter(app => {
    const matchesSearch = !searchTerm || 
      app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicantId.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || app.paymentStatus === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  }) || [];

  // Calculate treasury-specific statistics
  const stats = {
    totalRevenue: allApplications?.reduce((sum, app) => sum + (app.paymentStatus === 'paid' ? parseInt(app.fees || '0') : 0), 0) || 0,
    pendingPayments: allApplications?.filter(app => app.paymentStatus === 'pending').length || 0,
    paidToday: allApplications?.filter(app => 
      app.paymentStatus === 'paid' && 
      app.paymentDate &&
      new Date(app.paymentDate).toDateString() === new Date().toDateString()
    ).length || 0,
    overduePayments: allApplications?.filter(app => app.paymentStatus === 'overdue').length || 0,
    totalTransactions: allApplications?.filter(app => app.paymentStatus === 'paid').length || 0,
    revenueToday: allApplications?.filter(app => 
      app.paymentStatus === 'paid' && 
      app.paymentDate &&
      new Date(app.paymentDate).toDateString() === new Date().toDateString()
    ).reduce((sum, app) => sum + parseInt(app.fees || '0'), 0) || 0
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
              <Building2 className="h-6 w-6 text-green-600 ml-2" />
              <span className="text-lg font-semibold">الصندوق - إدارة المدفوعات</span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation('/employee/public-service')}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                data-testid="button-goto-public-service"
              >
                <FileCheck className="h-4 w-4 ml-2" />
                خدمة الجمهور
              </Button>
              <div className="flex items-center bg-green-50 dark:bg-green-900 px-3 py-1 rounded-full">
                <Bell className="h-4 w-4 text-green-600 ml-2" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  {stats.pendingPayments} طلب في انتظار السداد
                </span>
              </div>
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
              <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">ريال يمني</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">في انتظار السداد</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingPayments}</div>
              <p className="text-xs text-muted-foreground">طلب غير مدفوع</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مدفوعة اليوم</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.paidToday}</div>
              <p className="text-xs text-muted-foreground">عملية دفع</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">متأخرة</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overduePayments}</div>
              <p className="text-xs text-muted-foreground">طلب متأخر</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي العمليات</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">عملية مكتملة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إيرادات اليوم</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.revenueToday)}</div>
              <p className="text-xs text-muted-foreground">ريال يمني</p>
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                    <SelectItem value="pending_payment">في انتظار السداد</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>حالة السداد</Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حالة السداد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">في انتظار السداد</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="overdue">متأخر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("pending_payment");
                    setPaymentFilter("all");
                  }}
                  className="w-full"
                >
                  إعادة تعيين
                </Button>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="default" 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 ml-2" />
                  تقرير يومي
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
                <CreditCard className="h-5 w-5 ml-2" />
                جدول المدفوعات ({filteredApplications.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">جاري تحميل البيانات...</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">لا توجد مدفوعات مطابقة للبحث</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>اسم المستفيد</TableHead>
                      <TableHead>نوع الخدمة</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>حالة السداد</TableHead>
                      <TableHead>تاريخ الطلب</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.applicationNumber}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {application.invoiceNumber}
                        </TableCell>
                        <TableCell>{application.applicantName}</TableCell>
                        <TableCell>{application.serviceType}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(application.fees || '0')} ريال
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentStatusConfig(application.paymentStatus || 'pending').color}>
                            <span className="flex items-center">
                              {getPaymentStatusConfig(application.paymentStatus || 'pending').icon}
                              <span className="mr-1">{getPaymentStatusConfig(application.paymentStatus || 'pending').label}</span>
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(application.submittedAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewInvoice(application)}
                              data-testid={`button-view-invoice-${application.id}`}
                            >
                              <FileIcon className="h-4 w-4 ml-1" />
                              عرض الفاتورة
                            </Button>
                            
                            {application.paymentStatus === 'pending' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleConfirmPayment(application)}
                                disabled={confirmPaymentMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                                data-testid={`button-confirm-payment-${application.id}`}
                              >
                                <CheckCircle className="h-4 w-4 ml-1" />
                                تأكيد السداد
                              </Button>
                            )}

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
      </div>
    </div>
  );
}