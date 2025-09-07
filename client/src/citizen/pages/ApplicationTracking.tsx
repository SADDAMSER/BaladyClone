import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Search, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
  applicationData?: any;
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

export default function ApplicationTracking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<"application_number" | "national_id">("application_number");
  const [hasSearched, setHasSearched] = useState(false);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setHasSearched(true);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center">
                  <ArrowLeft className="h-4 w-4 ml-2" />
                  العودة للرئيسية
                </Button>
              </Link>
              <Separator orientation="vertical" className="mx-4 h-8" />
              <div className="flex items-center">
                <Building2 className="h-6 w-6 text-blue-600 ml-2" />
                <span className="text-lg font-semibold">تتبع الطلبات</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 ml-2" />
              البحث عن طلب
            </CardTitle>
            <CardDescription>
              ادخل رقم الطلب أو رقم الهوية للبحث عن حالة طلبك
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
          <div className="space-y-6">
            {/* Application Overview */}
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
                    تتبع جميع التحديثات والتغييرات التي طرأت على طلبك
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
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
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
                    <Button variant="outline" asChild>
                      <Link href="/">
                        العودة للرئيسية
                      </Link>
                    </Button>
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
      </div>
    </div>
  );
}