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
  Download,
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
  
  // Invoice and payment dialogs state
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPaymentReceiptDialog, setShowPaymentReceiptDialog] = useState(false);
  const [invoiceApplication, setInvoiceApplication] = useState<ApplicationDetails | null>(null);
  const [paymentReceiptData, setPaymentReceiptData] = useState<any>(null);

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
      const token = localStorage.getItem('employee_token');
      localStorage.setItem("auth-token", token || '');
      
      try {
        const response = await apiRequest('GET', '/api/treasury-applications');
        const applications = await response.json();
        return applications;
      } finally {
        localStorage.removeItem("auth-token");
      }
    },
    enabled: isLoggedIn,
    retry: false,
    refetchOnWindowFocus: false
  });

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async (data: { applicationId: string; paymentMethod: string; notes?: string }) => {
      const token = localStorage.getItem('employee_token');
      localStorage.setItem("auth-token", token || '');
      
      try {
        const response = await apiRequest('POST', '/api/payments/confirm', {
          applicationId: data.applicationId,
          paymentMethod: data.paymentMethod || 'cash',
          notes: data.notes || 'تم السداد نقداً في الصندوق',
          amount: invoiceApplication?.fees
        });
        return await response.json();
      } finally {
        localStorage.removeItem("auth-token");
      }
    },
    onSuccess: (result) => {
      const receiptData = {
        paymentId: result.payment.id,
        applicationNumber: invoiceApplication?.applicationNumber,
        applicantName: invoiceApplication?.applicantName,
        applicantId: invoiceApplication?.applicantId,
        amount: invoiceApplication?.fees,
        paymentMethod: 'نقدي',
        paymentDate: new Date().toISOString(),
        cashierName: currentUser?.fullName || currentUser?.username,
        serviceType: invoiceApplication?.serviceType
      };
      
      setPaymentReceiptData(receiptData);
      setShowInvoiceDialog(false);
      setShowPaymentReceiptDialog(true);
      
      queryClient.invalidateQueries({ queryKey: ['/api/treasury-applications'] });
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
    setInvoiceApplication(application);
    setShowInvoiceDialog(true);
  };

  const handleConfirmPayment = () => {
    if (!invoiceApplication) return;
    
    confirmPaymentMutation.mutate({
      applicationId: invoiceApplication.id,
      paymentMethod: 'cash',
      notes: 'تم السداد نقداً في الصندوق'
    });
  };

  const handlePrintReceipt = () => {
    window.print();
    
    // Close dialogs after printing
    setTimeout(() => {
      setShowPaymentReceiptDialog(false);
      setPaymentReceiptData(null);
      setInvoiceApplication(null);
      toast({
        title: "تذكير مهم",
        description: "يرجى فصل الجزء السفلي من النموذج وتسليمه للمستفيد كإيصال سداد",
        variant: "default",
      });
    }, 1000);
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

  const formatCurrencyDetailed = (amount: number) => {
    return new Intl.NumberFormat('ar-YE', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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
                                onClick={() => {
                                  setInvoiceApplication(application);
                                  setShowInvoiceDialog(true);
                                }}
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

        {/* Invoice Dialog */}
        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:shadow-none print:max-w-full print:max-h-full" dir="rtl">
            <div className="print:p-0" id="invoice-content">
              {invoiceApplication && (
                <>
                  {/* Dialog Header - Hidden in print */}
                  <div className="print:hidden mb-4">
                    <DialogHeader>
                      <DialogTitle className="text-right">فاتورة سداد - {invoiceApplication.invoiceNumber}</DialogTitle>
                      <DialogDescription className="text-right">
                        راجع تفاصيل الفاتورة واضغط تأكيد السداد لإتمام العملية
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={handleConfirmPayment}
                        disabled={confirmPaymentMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 ml-2" />
                        {confirmPaymentMutation.isPending ? 'جاري التأكيد...' : 'تأكيد السداد'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowInvoiceDialog(false)}
                        disabled={confirmPaymentMutation.isPending}
                      >
                        إغلاق
                      </Button>
                    </div>
                  </div>

                  {/* Invoice Content */}
                  <div className="bg-white">
                    {/* Invoice Header */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        {/* Left side - Application details */}
                        <div className="space-y-2 text-sm">
                          <div><strong>رقم الطلب:</strong> {invoiceApplication.applicationNumber}</div>
                          <div><strong>تاريخ الطلب:</strong> {formatDate(invoiceApplication.submittedAt)}</div>
                          <div><strong>رقم الفاتورة:</strong> {invoiceApplication.invoiceNumber}</div>
                          <div><strong>حالة الفاتورة:</strong> 
                            <Badge className={`mr-2 ${
                              invoiceApplication.paymentStatus === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {invoiceApplication.paymentStatus === 'paid' ? 'تم الدفع' : 'غير مدفوع'}
                            </Badge>
                          </div>
                        </div>

                        {/* Center - QR Code */}
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-gray-200 border-2 border-gray-400 flex items-center justify-center">
                            <div className="grid grid-cols-6 gap-px w-16 h-16">
                              {Array.from({ length: 36 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-full h-full ${
                                    Math.random() > 0.5 ? 'bg-black' : 'bg-white'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">QR Code</p>
                        </div>

                        {/* Right side - Ministry logo and header */}
                        <div className="text-center">
                          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-2">
                            شعار
                          </div>
                          <h1 className="text-lg font-bold text-gray-900">الجمهورية اليمنية</h1>
                          <p className="text-sm text-gray-600">وزارة النقل والأشغال العامة</p>
                          <h2 className="text-xl font-bold text-teal-600 mt-4">إشعار سداد</h2>
                        </div>
                      </div>
                    </div>

                    {/* Customer Details Section */}
                    <div className="p-4">
                      <div className="bg-teal-600 text-white px-4 py-2 rounded-t-lg">
                        <h3 className="font-semibold">تفاصيل المستفيد والخدمة</h3>
                      </div>
                      <div className="border border-gray-200 rounded-b-lg p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="font-semibold text-gray-700">اسم الخدمة:</span>
                            <span className="mr-2">{invoiceApplication.serviceType}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">رقم الهوية:</span>
                            <span className="mr-2">{invoiceApplication.applicantId}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">اسم المستفيد:</span>
                            <span className="mr-2">{invoiceApplication.applicantName}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="font-semibold text-gray-700">نوع الوثيقة:</span>
                            <span className="mr-2">مساحة بحسب الوثيقة</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">حالة الوثيقة:</span>
                            <span className="mr-2">--</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">مساحة بحسب الوثيقة:</span>
                            <span className="mr-2">{invoiceApplication.applicationData.area || '700'} متر مربع</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Details Section */}
                    <div className="p-4">
                      <div className="bg-teal-600 text-white px-4 py-2 rounded-t-lg">
                        <h3 className="font-semibold">تفاصيل الفاتورة</h3>
                      </div>
                      <div className="border border-gray-200 rounded-b-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <span className="font-semibold text-gray-700">رقم الحساب:</span>
                            <span className="mr-2">30000001</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">اسم الحساب:</span>
                            <span className="mr-2">حساب الإيرادات</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">تاريخ الفاتورة:</span>
                            <span className="mr-2">{formatDate(invoiceApplication.submittedAt)}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">المرجع:</span>
                            <span className="mr-2">{invoiceApplication.invoiceNumber?.slice(-6)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="font-semibold text-gray-700">العملة:</span>
                            <span className="mr-2">ريال يمني</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">إجمالي المبلغ المستحق:</span>
                            <span className="mr-2 text-lg font-bold text-teal-600">{formatCurrencyDetailed(parseInt(invoiceApplication.fees || '0'))} ريال</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fees Breakdown Table */}
                    <div className="p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 px-4 py-2 text-right">الإجمالي</th>
                              <th className="border border-gray-300 px-4 py-2 text-right">السعر الجزئي</th>
                              <th className="border border-gray-300 px-4 py-2 text-right">الكمية/العدد</th>
                              <th className="border border-gray-300 px-4 py-2 text-right">اسم الوحدة</th>
                              <th className="border border-gray-300 px-4 py-2 text-right">تفاصيل</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-gray-300 px-4 py-2 font-semibold">
                                {formatCurrencyDetailed(Math.floor(parseInt(invoiceApplication.fees || '0') * 0.96))}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {formatCurrencyDetailed(500)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">{invoiceApplication.applicationData.area || '700'}</td>
                              <td className="border border-gray-300 px-4 py-2">م مربع</td>
                              <td className="border border-gray-300 px-4 py-2">
                                مقابل رسوم الخدمة لمساحة {invoiceApplication.applicationData.area || '700'} متر مربع
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 px-4 py-2 font-semibold">
                                {formatCurrencyDetailed(Math.floor(parseInt(invoiceApplication.fees || '0') * 0.04))}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {formatCurrencyDetailed(Math.floor(parseInt(invoiceApplication.fees || '0') * 0.04))}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">1</td>
                              <td className="border border-gray-300 px-4 py-2">--</td>
                              <td className="border border-gray-300 px-4 py-2">
                                رسوم كشفية
                              </td>
                            </tr>
                            <tr className="bg-gray-50 font-bold">
                              <td className="border border-gray-300 px-4 py-2 text-lg text-teal-600">
                                {formatCurrencyDetailed(parseInt(invoiceApplication.fees || '0'))}
                              </td>
                              <td className="border border-gray-300 px-4 py-2" colSpan={4}>
                                إجمالي المبلغ المستحق
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 text-center text-sm text-gray-600">
                      <p>اسم المحصل: {currentUser?.fullName || currentUser?.username}</p>
                      <p>توقيع المحصل</p>
                      <div className="mt-4 text-xs">
                        <p>هذه الفاتورة صادرة إلكترونياً ولا تحتاج لختم أو توقيع</p>
                        <p>للاستفسار: {invoiceApplication.contactPhone} | البريد الإلكتروني: info@transport.gov.ye</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Receipt Dialog */}
        <Dialog open={showPaymentReceiptDialog} onOpenChange={setShowPaymentReceiptDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:shadow-none print:max-w-full print:max-h-full" dir="rtl">
            <div className="print:p-0" id="receipt-content">
              {paymentReceiptData && (
                <>
                  {/* Dialog Header - Hidden in print */}
                  <div className="print:hidden mb-4">
                    <DialogHeader>
                      <DialogTitle className="text-right">إشعار السداد - {paymentReceiptData.paymentId}</DialogTitle>
                      <DialogDescription className="text-right">
                        <div className="space-y-2">
                          <div>تم تأكيد السداد بنجاح.</div>
                          <div className="text-orange-600 font-semibold">
                            ⚠️ تذكير: المستفيد قد تسلم النموذج الموحد مسبقاً من الخدمة العامة. 
                            يرجى فصل الجزء السفلي القابل للفصل وتسليمه كإيصال سداد.
                          </div>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={handlePrintReceipt}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Printer className="h-4 w-4 ml-2" />
                        طباعة الإشعار
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowPaymentReceiptDialog(false)}
                      >
                        إغلاق
                      </Button>
                    </div>
                  </div>

                  {/* Receipt Content */}
                  <div className="bg-white">
                    {/* Receipt Header */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        {/* Left side - Payment details */}
                        <div className="space-y-2 text-sm">
                          <div><strong>رقم العملية:</strong> {paymentReceiptData.paymentId}</div>
                          <div><strong>تاريخ السداد:</strong> {formatDate(paymentReceiptData.paymentDate)}</div>
                          <div><strong>طريقة الدفع:</strong> {paymentReceiptData.paymentMethod}</div>
                          <div><strong>حالة الدفعة:</strong> 
                            <Badge className="mr-2 bg-green-100 text-green-800">
                              تم الدفع
                            </Badge>
                          </div>
                        </div>

                        {/* Center - QR Code */}
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-gray-200 border-2 border-gray-400 flex items-center justify-center">
                            <div className="grid grid-cols-6 gap-px w-16 h-16">
                              {Array.from({ length: 36 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-full h-full ${
                                    Math.random() > 0.5 ? 'bg-black' : 'bg-white'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">QR Code</p>
                        </div>

                        {/* Right side - Ministry logo and header */}
                        <div className="text-center">
                          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-2">
                            شعار
                          </div>
                          <h1 className="text-lg font-bold text-gray-900">الجمهورية اليمنية</h1>
                          <p className="text-sm text-gray-600">وزارة النقل والأشغال العامة</p>
                          <h2 className="text-xl font-bold text-green-600 mt-4">إشعار سداد</h2>
                        </div>
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="p-6 bg-green-50 border-b border-gray-200">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          تم استلام المبلغ
                        </div>
                        <div className="text-3xl font-bold text-green-700">
                          {formatCurrency(paymentReceiptData.amount)} ريال يمني
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          المبلغ بالأرقام: {paymentReceiptData.amount}
                        </div>
                      </div>
                    </div>

                    {/* Payer Details */}
                    <div className="p-4">
                      <div className="bg-teal-600 text-white px-4 py-2 rounded-t-lg">
                        <h3 className="font-semibold">تفاصيل الدافع والخدمة</h3>
                      </div>
                      <div className="border border-gray-200 rounded-b-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="font-semibold text-gray-700">اسم الدافع:</span>
                            <span className="mr-2">{paymentReceiptData.applicantName}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">رقم الهوية:</span>
                            <span className="mr-2">{paymentReceiptData.applicantId}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">رقم الطلب:</span>
                            <span className="mr-2">{paymentReceiptData.applicationNumber}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">نوع الخدمة:</span>
                            <span className="mr-2">{paymentReceiptData.serviceType}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="p-4">
                      <div className="bg-teal-600 text-white px-4 py-2 rounded-t-lg">
                        <h3 className="font-semibold">تفاصيل الدفعة</h3>
                      </div>
                      <div className="border border-gray-200 rounded-b-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="font-semibold text-gray-700">طريقة الدفع:</span>
                            <span className="mr-2">{paymentReceiptData.paymentMethod}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">تاريخ السداد:</span>
                            <span className="mr-2">{formatDate(paymentReceiptData.paymentDate)}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">اسم المحصل:</span>
                            <span className="mr-2">{paymentReceiptData.cashierName}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">المبلغ المدفوع:</span>
                            <span className="mr-2 text-green-600 font-bold">{formatCurrency(paymentReceiptData.amount)} ريال</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t-2 border-green-600 text-center">
                      <div className="mb-4">
                        <div className="text-lg font-bold text-green-600">تم إكمال عملية السداد بنجاح</div>
                        <div className="text-sm text-gray-600">نشكركم لاختياركم خدماتنا الرقمية</div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-4">
                        <div className="grid grid-cols-2 gap-8 mb-4">
                          <div>
                            <p className="font-semibold">توقيع المحصل</p>
                            <div className="h-12 border-b border-gray-300 mt-2"></div>
                            <p className="text-xs text-gray-600 mt-1">{paymentReceiptData.cashierName}</p>
                          </div>
                          <div>
                            <p className="font-semibold">ختم الصندوق</p>
                            <div className="h-12 w-12 border-2 border-gray-300 rounded-full mx-auto mt-2 flex items-center justify-center">
                              <span className="text-xs text-gray-400">ختم</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          <p>هذا الإشعار صادر إلكترونياً ومعتمد لدى الجهات الحكومية</p>
                          <p>رقم العملية: {paymentReceiptData.paymentId} | تاريخ الإصدار: {formatDate(new Date().toISOString())}</p>
                        </div>
                      </div>
                    </div>
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