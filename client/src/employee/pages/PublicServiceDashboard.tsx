import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import EmployeeLogin from "@/employee/components/EmployeeLogin";
import { 
  FileText, 
  User, 
  MapPin, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calculator,
  Search,
  Filter,
  Building2,
  Phone,
  Mail,
  AlertCircle,
  LogOut
} from "lucide-react";

interface ApplicationDetails {
  id: string;
  applicationNumber: string;
  serviceType: string;
  status: string;
  currentStage: string;
  submittedAt: string;
  estimatedCompletion?: string;
  applicantName: string;
  applicantId: string;
  contactPhone: string;
  email?: string;
  applicationData: {
    governorate?: string;
    district?: string;
    area?: string;
    landNumber?: string;
    plotNumber?: string;
    surveyType?: string;
    purpose?: string;
    description?: string;
  };
  fees?: string;
  isPaid?: boolean;
  assignedTo?: {
    username: string;
    role: string;
    department: string;
  };
  statusHistory?: Array<{
    status: string;
    changedAt: string;
    notes?: string;
  }>;
}

interface ReviewData {
  decision: 'approved' | 'rejected';
  notes: string;
  calculatedFees: number;
  reviewerComments: string;
}

const statusConfig = {
  submitted: { 
    label: "تم التقديم", 
    color: "bg-blue-100 text-blue-800", 
    icon: <FileText className="h-4 w-4" /> 
  },
  in_review: { 
    label: "قيد المراجعة", 
    color: "bg-yellow-100 text-yellow-800", 
    icon: <Clock className="h-4 w-4" /> 
  },
  approved: { 
    label: "موافق", 
    color: "bg-green-100 text-green-800", 
    icon: <CheckCircle className="h-4 w-4" /> 
  },
  rejected: { 
    label: "مرفوض", 
    color: "bg-red-100 text-red-800", 
    icon: <XCircle className="h-4 w-4" /> 
  },
  pending_payment: { 
    label: "في انتظار السداد", 
    color: "bg-orange-100 text-orange-800", 
    icon: <AlertCircle className="h-4 w-4" /> 
  },
  completed: { 
    label: "مكتمل", 
    color: "bg-green-100 text-green-800", 
    icon: <CheckCircle className="h-4 w-4" /> 
  }
};

export default function PublicServiceDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string>("");
  
  // States for search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<"application_number" | "national_id">("application_number");
  const [hasSearched, setHasSearched] = useState(false);
  
  // States for review functionality
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetails | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData>({
    decision: 'approved',
    notes: '',
    calculatedFees: 0,
    reviewerComments: ''
  });
  
  // States for UI
  const [activeTab, setActiveTab] = useState("search");

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
    setActiveTab("search");
    toast({
      title: "تم تسجيل الخروج",
      description: "تم تسجيل خروجك بنجاح",
    });
  };

  // Query for application search/tracking
  const { data: applicationDetails, isLoading, error } = useQuery<ApplicationDetails>({
    queryKey: ['/api/track-application', searchTerm, searchBy],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/track-application?search_term=${searchTerm}&search_by=${searchBy}`);
      return await response.json();
    },
    enabled: hasSearched && searchTerm.length > 0,
    retry: false,
    refetchOnWindowFocus: false
  });

  // Review application mutation
  const reviewMutation = useMutation({
    mutationFn: async (data: { applicationId: string; reviewData: ReviewData }) => {
      // Set token in localStorage temporarily for this request
      const originalToken = localStorage.getItem("auth-token");
      localStorage.setItem("auth-token", authToken);
      
      try {
        const response = await apiRequest('POST', `/api/applications/${data.applicationId}/public-service-review`, data.reviewData);
        return await response.json();
      } finally {
        // Restore original token
        if (originalToken) {
          localStorage.setItem("auth-token", originalToken);
        } else {
          localStorage.removeItem("auth-token");
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: reviewData.decision === 'approved' ? "تم اعتماد الطلب بنجاح" : "تم رفض الطلب",
        variant: reviewData.decision === 'approved' ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/track-application'] });
      setSelectedApplication(null);
      setReviewData({ decision: 'approved', notes: '', calculatedFees: 0, reviewerComments: '' });
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setHasSearched(true);
      setSelectedApplication(null);
    }
  };

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

    reviewMutation.mutate({
      applicationId: selectedApplication.id,
      reviewData
    });
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
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
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {new Date().toLocaleDateString('ar-YE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="search" data-testid="tab-search">
              البحث وتتبع الطلبات
            </TabsTrigger>
            <TabsTrigger value="review" data-testid="tab-review">
              مراجعة واعتماد الطلبات
            </TabsTrigger>
          </TabsList>

          {/* Search and Tracking Tab */}
          <TabsContent value="search" className="space-y-6">
            {/* Search Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 ml-2" />
                  البحث عن طلب
                </CardTitle>
                <CardDescription>
                  ابحث عن الطلبات المقدمة باستخدام رقم الطلب أو رقم الهوية
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>البحث بواسطة</Label>
                      <select 
                        className="w-full p-2 border rounded-md"
                        value={searchBy}
                        onChange={(e) => setSearchBy(e.target.value as "application_number" | "national_id")}
                      >
                        <option value="application_number">رقم الطلب</option>
                        <option value="national_id">رقم الهوية</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {searchBy === "application_number" ? "رقم الطلب" : "رقم الهوية"}
                      </Label>
                      <Input
                        placeholder={searchBy === "application_number" ? "مثال: APP-2025-123456" : "مثال: 123456789"}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="input-search-term"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full" data-testid="button-search">
                        <Search className="h-4 w-4 ml-2" />
                        بحث
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">جاري البحث...</p>
              </div>
            )}

            {/* Error State */}
            {error && hasSearched && (
              <Alert className="mb-8">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  لم يتم العثور على طلب بالمعلومات المدخلة. تأكد من صحة رقم الطلب أو رقم الهوية.
                </AlertDescription>
              </Alert>
            )}

            {/* Application Details */}
            {applicationDetails && !isLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Application Overview */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">
                            طلب رقم: {applicationDetails.applicationNumber}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            نوع الخدمة: {applicationDetails.serviceType}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusConfig(applicationDetails.status).color}>
                          <span className="flex items-center">
                            {getStatusConfig(applicationDetails.status).icon}
                            <span className="mr-1">{getStatusConfig(applicationDetails.status).label}</span>
                          </span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-500 ml-2" />
                            <span className="text-sm text-gray-600">تاريخ التقديم:</span>
                            <span className="mr-2 font-medium">{formatDate(applicationDetails.submittedAt)}</span>
                          </div>
                          {applicationDetails.estimatedCompletion && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-500 ml-2" />
                              <span className="text-sm text-gray-600">التاريخ المتوقع للإنجاز:</span>
                              <span className="mr-2 font-medium">{formatDate(applicationDetails.estimatedCompletion)}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-500 ml-2" />
                            <span className="text-sm text-gray-600">اسم المتقدم:</span>
                            <span className="mr-2 font-medium">{applicationDetails.applicantName}</span>
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-500 ml-2" />
                            <span className="text-sm text-gray-600">رقم الهاتف:</span>
                            <span className="mr-2 font-medium">{applicationDetails.contactPhone}</span>
                          </div>
                        </div>
                      </div>
                      
                      {applicationDetails.assignedTo && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                          <h4 className="font-medium mb-2">معلومات الموظف المختص</h4>
                          <div className="text-sm space-y-1">
                            <p><span className="text-gray-600">القسم:</span> {applicationDetails.assignedTo.department}</p>
                            <p><span className="text-gray-600">المسؤول:</span> {applicationDetails.assignedTo.username}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Status Timeline */}
                  {applicationDetails.statusHistory && applicationDetails.statusHistory.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>سجل حالة الطلب</CardTitle>
                        <CardDescription>
                          تتبع جميع التحديثات والتغييرات التي طرأت على الطلب
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {applicationDetails.statusHistory.map((entry, index) => (
                            <div key={index} className="flex items-start space-x-3 space-x-reverse">
                              <div className="flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusConfig(entry.status).color}`}>
                                  {getStatusConfig(entry.status).icon}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                  <p className="font-medium">
                                    {getStatusConfig(entry.status).label}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {formatDate(entry.changedAt)}
                                  </p>
                                </div>
                                {entry.notes && (
                                  <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Application Data */}
                  {applicationDetails.applicationData && (
                    <Card>
                      <CardHeader>
                        <CardTitle>تفاصيل الطلب</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {Object.entries(applicationDetails.applicationData).map(([key, value]) => (
                            value && (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            )
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Next Steps */}
                  <Card>
                    <CardHeader>
                      <CardTitle>الخطوات التالية</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {applicationDetails.status === 'submitted' && (
                          <Alert>
                            <Clock className="h-4 w-4" />
                            <AlertDescription>
                              طلبك قيد المراجعة الأولية. سيتم التواصل معك في حال الحاجة لمعلومات إضافية.
                            </AlertDescription>
                          </Alert>
                        )}
                        {applicationDetails.status === 'in_review' && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              طلبك قيد المراجعة من قبل الفريق المختص. سيتم إشعارك بأي تحديثات.
                            </AlertDescription>
                          </Alert>
                        )}
                        {applicationDetails.status === 'pending_payment' && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              يرجى زيارة المكتب لدفع الرسوم المطلوبة لإكمال معالجة طلبك.
                            </AlertDescription>
                          </Alert>
                        )}
                        {applicationDetails.status === 'approved' && (
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              تم الموافقة على طلبك! يمكنك زيارة المكتب لاستلام الوثائق النهائية.
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                          <Button variant="outline">
                            <Phone className="h-4 w-4 ml-2" />
                            التواصل مع المكتب
                          </Button>
                          <Button variant="outline">
                            طباعة التفاصيل
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions Panel */}
                <div className="lg:col-span-1">
                  <Card className="sticky top-6">
                    <CardHeader>
                      <CardTitle>إجراءات سريعة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        onClick={() => {
                          setSelectedApplication(applicationDetails);
                          setActiveTab("review");
                        }}
                        className="w-full"
                        data-testid="button-start-review"
                      >
                        <FileText className="h-4 w-4 ml-2" />
                        بدء مراجعة الطلب
                      </Button>
                      
                      <Button variant="outline" className="w-full">
                        <Phone className="h-4 w-4 ml-2" />
                        التواصل مع المتقدم
                      </Button>
                      
                      <Button variant="outline" className="w-full">
                        طباعة التفاصيل
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Help Section */}
            {!hasSearched && (
              <Card>
                <CardHeader>
                  <CardTitle>تحتاج مساعدة؟</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">كيفية العثور على رقم الطلب</h4>
                      <p className="text-sm text-gray-600">
                        رقم الطلب موجود في رسالة التأكيد التي تم إرسالها عند تقديم الطلب، 
                        أو يمكن العثور عليه في الإيصال المطبوع.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">للاستفسارات</h4>
                      <div className="text-sm space-y-1">
                        <p className="flex items-center">
                          <Phone className="h-4 w-4 ml-2" />
                          +967 1 123 456
                        </p>
                        <p className="flex items-center">
                          <Mail className="h-4 w-4 ml-2" />
                          support@yemen-platform.gov.ye
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-6">
            {selectedApplication ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Application Details */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 ml-2" />
                        تفاصيل الطلب - {selectedApplication.applicationNumber}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div><strong>نوع الخدمة:</strong> {selectedApplication.serviceType}</div>
                          <div><strong>اسم المتقدم:</strong> {selectedApplication.applicantName}</div>
                          <div><strong>رقم الهوية:</strong> {selectedApplication.applicantId}</div>
                          <div><strong>رقم الهاتف:</strong> {selectedApplication.contactPhone}</div>
                        </div>
                        <div className="space-y-3">
                          {selectedApplication.applicationData.governorate && (
                            <div><strong>المحافظة:</strong> {selectedApplication.applicationData.governorate}</div>
                          )}
                          {selectedApplication.applicationData.district && (
                            <div><strong>المديرية:</strong> {selectedApplication.applicationData.district}</div>
                          )}
                          {selectedApplication.applicationData.purpose && (
                            <div><strong>الغرض:</strong> {selectedApplication.applicationData.purpose}</div>
                          )}
                          <div><strong>تاريخ التقديم:</strong> {formatDate(selectedApplication.submittedAt)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Review Panel */}
                <div className="lg:col-span-1">
                  <Card className="sticky top-6">
                    <CardHeader>
                      <CardTitle>مراجعة الطلب</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                            data-testid="input-calculated-fees"
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
                          data-testid="textarea-reviewer-comments"
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
                          data-testid="textarea-notes"
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
                          data-testid="button-approve"
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
                          data-testid="button-reject"
                        >
                          <XCircle className="h-4 w-4 ml-2" />
                          رفض
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedApplication(null);
                          setActiveTab("search");
                        }}
                        className="w-full mt-4"
                      >
                        العودة للبحث
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا يوجد طلب محدد للمراجعة</h3>
                  <p className="text-gray-600 mb-4">
                    ابحث عن طلب أولاً ثم اختر "بدء مراجعة الطلب" لبدء عملية المراجعة
                  </p>
                  <Button onClick={() => setActiveTab("search")} data-testid="button-go-to-search">
                    <Search className="h-4 w-4 ml-2" />
                    ابدأ البحث
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}