import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  User,
  Calendar,
  DollarSign,
  MessageSquare,
  Download,
  Phone,
  Mail,
  MapPin,
  Building,
  Map,
  Eye,
  ArrowRight,
  RefreshCw
} from "lucide-react";

interface ApplicationData {
  id: string;
  applicationNumber: string;
  serviceName: string;
  serviceNameEn: string;
  serviceIcon: string;
  status: 'submitted' | 'under_review' | 'pending_documents' | 'approved' | 'rejected' | 'completed';
  currentStep: number;
  totalSteps: number;
  submittedAt: string;
  lastUpdated: string;
  expectedCompletion: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail?: string;
  fees: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  steps: Array<{
    id: number;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'rejected';
    completedAt?: string;
    assignee?: string;
    notes?: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    status: 'uploaded' | 'verified' | 'rejected';
    uploadedAt: string;
    rejectionReason?: string;
  }>;
  notes: Array<{
    id: string;
    type: 'system' | 'user' | 'admin';
    message: string;
    createdAt: string;
    author?: string;
  }>;
}

// Mock application data
const mockApplicationData: Record<string, ApplicationData> = {
  "APP-2024-001": {
    id: "1",
    applicationNumber: "APP-2024-001",
    serviceName: "إصدار رخصة بناء",
    serviceNameEn: "Building License Issuance",
    serviceIcon: "Building",
    status: "under_review",
    currentStep: 2,
    totalSteps: 5,
    submittedAt: "2024-01-15T10:30:00Z",
    lastUpdated: "2024-01-16T14:20:00Z",
    expectedCompletion: "2024-01-22T17:00:00Z",
    applicantName: "أحمد محمد الحسني",
    applicantPhone: "967771234567",
    applicantEmail: "ahmed.hassan@email.com",
    fees: "500.00",
    paymentStatus: "paid",
    steps: [
      {
        id: 1,
        title: "تقديم الطلب",
        description: "تم استلام الطلب والمستندات",
        status: "completed",
        completedAt: "2024-01-15T10:30:00Z",
        assignee: "النظام الآلي",
      },
      {
        id: 2,
        title: "المراجعة الأولية",
        description: "مراجعة اكتمال المستندات والبيانات",
        status: "in_progress",
        assignee: "سارة أحمد - قسم المراجعة",
        notes: "جاري مراجعة المخططات المعمارية"
      },
      {
        id: 3,
        title: "الفحص الفني",
        description: "مراجعة المخططات من قبل المهندسين",
        status: "pending"
      },
      {
        id: 4,
        title: "الكشف الميداني",
        description: "زيارة الموقع للتأكد من المطابقة",
        status: "pending"
      },
      {
        id: 5,
        title: "الاعتماد والإصدار",
        description: "اعتماد الترخيص وإشعار المتقدم",
        status: "pending"
      }
    ],
    documents: [
      {
        id: "1",
        name: "صورة البطاقة الشخصية",
        status: "verified",
        uploadedAt: "2024-01-15T10:25:00Z"
      },
      {
        id: "2",
        name: "صك الملكية",
        status: "verified", 
        uploadedAt: "2024-01-15T10:26:00Z"
      },
      {
        id: "3",
        name: "المخططات المعمارية",
        status: "uploaded",
        uploadedAt: "2024-01-15T10:28:00Z"
      },
      {
        id: "4",
        name: "القرار المساحي",
        status: "rejected",
        uploadedAt: "2024-01-15T10:29:00Z",
        rejectionReason: "الصورة غير واضحة، يرجى رفع نسخة أوضح"
      }
    ],
    notes: [
      {
        id: "1",
        type: "system",
        message: "تم تقديم الطلب بنجاح ودفع الرسوم",
        createdAt: "2024-01-15T10:30:00Z"
      },
      {
        id: "2",
        type: "admin",
        message: "يرجى رفع نسخة أوضح من القرار المساحي",
        createdAt: "2024-01-16T14:20:00Z",
        author: "سارة أحمد"
      }
    ]
  }
};

const statusConfig = {
  submitted: { label: "تم التقديم", color: "bg-blue-500", icon: FileText },
  under_review: { label: "قيد المراجعة", color: "bg-yellow-500", icon: Clock },
  pending_documents: { label: "بانتظار المستندات", color: "bg-orange-500", icon: AlertCircle },
  approved: { label: "معتمد", color: "bg-green-500", icon: CheckCircle },
  rejected: { label: "مرفوض", color: "bg-red-500", icon: XCircle },
  completed: { label: "مكتمل", color: "bg-green-600", icon: CheckCircle }
};

const stepStatusConfig = {
  pending: { label: "معلق", color: "bg-gray-400" },
  in_progress: { label: "جاري", color: "bg-blue-500" },
  completed: { label: "مكتمل", color: "bg-green-500" },
  rejected: { label: "مرفوض", color: "bg-red-500" }
};

const documentStatusConfig = {
  uploaded: { label: "مرفوع", color: "bg-blue-500", icon: FileText },
  verified: { label: "موثق", color: "bg-green-500", icon: CheckCircle },
  rejected: { label: "مرفوض", color: "bg-red-500", icon: XCircle }
};

export default function ApplicationTracking() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<ApplicationData | null>(null);

  const { data: application, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/applications", searchQuery],
    queryFn: () => Promise.resolve(mockApplicationData[searchQuery]),
    enabled: !!searchQuery
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    // The query will trigger automatically due to the enabled condition
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status: ApplicationData['status']) => {
    return statusConfig[status] || statusConfig.submitted;
  };

  const getDocumentStatusConfig = (status: 'uploaded' | 'verified' | 'rejected') => {
    return documentStatusConfig[status];
  };

  const getStepStatusConfig = (status: 'pending' | 'in_progress' | 'completed' | 'rejected') => {
    return stepStatusConfig[status];
  };

  const calculateProgress = (currentStep: number, totalSteps: number) => {
    return Math.min((currentStep / totalSteps) * 100, 100);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl" data-testid="application-tracking">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">تتبع الطلبات</h1>
        <p className="text-lg text-muted-foreground">
          تتبع حالة طلباتك ومراجعة تقدم المعالجة
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <Search className="h-5 w-5" />
            <span>البحث عن طلب</span>
          </CardTitle>
          <CardDescription>
            أدخل رقم الطلب أو رقم المرجع لتتبع حالة طلبك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 space-x-reverse">
            <div className="flex-1">
              <Input
                placeholder="مثال: APP-2024-001"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="input-application-search"
              />
            </div>
            <Button onClick={handleSearch} disabled={!searchQuery.trim()} data-testid="button-search-application">
              <Search className="h-4 w-4 ml-2" />
              بحث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Application Results */}
      {isLoading && (
        <Card>
          <CardContent className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      )}

      {error && searchQuery && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            لم يتم العثور على طلب بالرقم المرجعي "{searchQuery}". تأكد من صحة الرقم أو تواصل مع الدعم الفني.
          </AlertDescription>
        </Alert>
      )}

      {application && (
        <div className="space-y-8">
          {/* Application Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{application.serviceName}</CardTitle>
                    <CardDescription>{application.serviceNameEn}</CardDescription>
                  </div>
                </div>
                <div className="text-left">
                  <Badge className={`${getStatusConfig(application.status).color} text-white mb-2`}>
                    {getStatusConfig(application.status).label}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    رقم الطلب: {application.applicationNumber}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">تاريخ التقديم</p>
                  <p className="flex items-center space-x-2 space-x-reverse">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(application.submittedAt)}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">آخر تحديث</p>
                  <p className="flex items-center space-x-2 space-x-reverse">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(application.lastUpdated)}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">الانتهاء المتوقع</p>
                  <p className="flex items-center space-x-2 space-x-reverse">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(application.expectedCompletion)}</span>
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">تقدم المعالجة</span>
                  <span className="text-sm text-muted-foreground">
                    الخطوة {application.currentStep} من {application.totalSteps}
                  </span>
                </div>
                <Progress value={calculateProgress(application.currentStep, application.totalSteps)} className="h-2" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{application.applicantName}</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    الرسوم: {application.fees} ريال
                    <Badge 
                      variant={application.paymentStatus === 'paid' ? 'default' : 'destructive'} 
                      className="mr-2 text-xs"
                    >
                      {application.paymentStatus === 'paid' ? 'مدفوع' : 'معلق'}
                    </Badge>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Steps */}
          <Card>
            <CardHeader>
              <CardTitle>خطوات المعالجة</CardTitle>
              <CardDescription>تتبع تقدم معالجة طلبك عبر المراحل المختلفة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {application.steps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-4 space-x-reverse">
                    <div className="flex-shrink-0">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getStepStatusConfig(step.status).color}`}
                      >
                        {step.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : step.status === 'rejected' ? (
                          <XCircle className="h-4 w-4" />
                        ) : step.status === 'in_progress' ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          step.id
                        )}
                      </div>
                      {index < application.steps.length - 1 && (
                        <div className="w-px h-12 bg-border mr-4 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 space-x-reverse mb-1">
                        <h4 className="font-semibold">{step.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getStepStatusConfig(step.status).label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                      {step.assignee && (
                        <p className="text-xs text-muted-foreground mb-1">
                          <strong>المسؤول:</strong> {step.assignee}
                        </p>
                      )}
                      {step.completedAt && (
                        <p className="text-xs text-muted-foreground mb-1">
                          <strong>تاريخ الإكمال:</strong> {formatDate(step.completedAt)}
                        </p>
                      )}
                      {step.notes && (
                        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                          {step.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Documents Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <FileText className="h-5 w-5" />
                  <span>حالة المستندات</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {application.documents.map((document) => {
                    const config = getDocumentStatusConfig(document.status);
                    const IconComponent = config.icon;
                    return (
                      <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{document.name}</p>
                            <p className="text-xs text-muted-foreground">
                              رُفع في: {formatDate(document.uploadedAt)}
                            </p>
                            {document.rejectionReason && (
                              <p className="text-xs text-red-600 mt-1">
                                سبب الرفض: {document.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Badge className={`${config.color} text-white text-xs`}>
                            {config.label}
                          </Badge>
                          <Button variant="ghost" size="sm" data-testid={`button-view-document-${document.id}`}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Communication & Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <MessageSquare className="h-5 w-5" />
                  <span>التواصل والملاحظات</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {application.notes.map((note) => (
                    <div key={note.id} className={`p-3 rounded-lg ${
                      note.type === 'system' ? 'bg-blue-50 border-l-4 border-blue-400' :
                      note.type === 'admin' ? 'bg-orange-50 border-l-4 border-orange-400' :
                      'bg-gray-50 border-l-4 border-gray-400'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-xs">
                          {note.type === 'system' ? 'النظام' : 
                           note.type === 'admin' ? 'إداري' : 'المستخدم'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm">{note.message}</p>
                      {note.author && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {note.author}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">تحتاج مساعدة؟</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Phone className="h-3 w-3" />
                      <span>967-1-234567</span>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Mail className="h-3 w-3" />
                      <span>support@yemen-construction.gov.ye</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="outline" data-testid="button-download-receipt">
                  <Download className="h-4 w-4 ml-2" />
                  تحميل إيصال
                </Button>
                <Button variant="outline" data-testid="button-print-application">
                  <FileText className="h-4 w-4 ml-2" />
                  طباعة الطلب
                </Button>
                <Button onClick={() => refetch()} data-testid="button-refresh-status">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  تحديث الحالة
                </Button>
                <Button 
                  onClick={() => setLocation('/services')}
                  data-testid="button-new-application"
                >
                  <ArrowRight className="h-4 w-4 ml-2" />
                  طلب خدمة جديدة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Getting Started Help */}
      {!searchQuery && (
        <Card>
          <CardHeader>
            <CardTitle>كيفية تتبع طلبك</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">أدخل رقم الطلب</h3>
                <p className="text-sm text-muted-foreground">
                  استخدم رقم الطلب المرجعي الذي حصلت عليه عند التقديم
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">تابع التقدم</h3>
                <p className="text-sm text-muted-foreground">
                  راجع خطوات المعالجة وحالة المستندات والتقدم المحرز
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">استلم النتيجة</h3>
                <p className="text-sm text-muted-foreground">
                  احصل على إشعار عند اكتمال المعالجة وجاهزية النتيجة
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}