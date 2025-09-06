import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Search,
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Calendar,
  MessageSquare,
  ArrowRight,
  Pause
} from "lucide-react";

interface ApplicationStatusHistory {
  id: string;
  applicationId: string;
  previousStatus: string;
  newStatus: string;
  previousStage?: string;
  newStage?: string;
  comments?: string;
  changedAt: string;
  changedBy: string;
  changeReason?: string;
}

interface Application {
  id: string;
  applicationNumber: string;
  serviceType: string;
  applicantName: string;
  applicantId: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'on_hold';
  currentStage: string;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  estimatedCompletionDate?: string;
  statusHistory?: ApplicationStatusHistory[];
}

const statusLabels = {
  pending: 'معلق',
  under_review: 'قيد المراجعة',
  approved: 'موافق عليه',
  rejected: 'مرفوض',
  on_hold: 'متوقف'
};

const statusIcons = {
  pending: Clock,
  under_review: ArrowRight,
  approved: CheckCircle,
  rejected: AlertCircle,
  on_hold: Pause
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  under_review: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  on_hold: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function ApplicationStatus() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const { data: applicationData, isLoading } = useQuery({
    queryKey: ['/api/applications', searchTerm],
    enabled: !!searchTerm,
  });
  
  const application = applicationData as Application | undefined;

  const { data: statusHistory = [] } = useQuery({
    queryKey: ['/api/applications', selectedApplication?.id, 'status-history'],
    enabled: !!selectedApplication?.id,
  });

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    // The query will automatically trigger when searchTerm changes
  };

  const StatusIcon = selectedApplication ? statusIcons[selectedApplication.status] : Clock;

  const timelineItems = Array.isArray(statusHistory) ? statusHistory.map((history: ApplicationStatusHistory) => ({
    id: history.id,
    title: statusLabels[history.newStatus as keyof typeof statusLabels] || history.newStatus,
    description: history.comments || `تغيير الحالة من ${statusLabels[history.previousStatus as keyof typeof statusLabels] || history.previousStatus} إلى ${statusLabels[history.newStatus as keyof typeof statusLabels] || history.newStatus}`,
    time: new Date(history.changedAt).toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    status: history.newStatus as 'pending' | 'under_review' | 'approved' | 'rejected' | 'on_hold'
  })) : [];

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          تتبع حالة الطلب
        </h1>
        <p className="text-gray-600">
          ادخل رقم الطلب أو رقم الهوية لمتابعة حالة طلبك
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            البحث عن طلب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">رقم الطلب أو رقم الهوية</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="أدخل رقم الطلب أو رقم الهوية"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="search-input"
              />
              <Button 
                onClick={handleSearch} 
                disabled={!searchTerm.trim() || isLoading}
                data-testid="search-button"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="h-4 w-4" />
                )}
                بحث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Details */}
      {application && (
        <Card className="mb-6" data-testid="application-details">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                تفاصيل الطلب
              </CardTitle>
              <Badge className={statusColors[application.status]}>
                {statusLabels[application.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">رقم الطلب:</span>
                  <span>{application.applicationNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">نوع الخدمة:</span>
                  <span>{application.serviceType}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="font-medium">مقدم الطلب:</span>
                  <span>{application.applicantName}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">تاريخ التقديم:</span>
                  <span>{new Date(application.submittedAt).toLocaleDateString('ar-YE')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">المرحلة الحالية:</span>
                  <span>{application.currentStage}</span>
                </div>
                {application.estimatedCompletionDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">التاريخ المتوقع للإنجاز:</span>
                    <span>{new Date(application.estimatedCompletionDate).toLocaleDateString('ar-YE')}</span>
                  </div>
                )}
              </div>
            </div>
            
            {application.description && (
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">وصف الطلب:</h4>
                <p className="text-gray-600">{application.description}</p>
              </div>
            )}
            
            <div className="pt-4 border-t">
              <Button
                onClick={() => setSelectedApplication(application)}
                className="w-full md:w-auto"
                data-testid="view-timeline-button"
              >
                <MessageSquare className="h-4 w-4 ml-2" />
                عرض سجل التغييرات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {selectedApplication && timelineItems.length > 0 && (
        <Card data-testid="status-timeline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5" />
              سجل حالات الطلب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timelineItems.map((item, index) => (
                <div key={item.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      item.status === 'approved' ? 'bg-green-500' :
                      item.status === 'rejected' ? 'bg-red-500' :
                      item.status === 'under_review' ? 'bg-blue-500' :
                      item.status === 'on_hold' ? 'bg-gray-500' :
                      'bg-yellow-500'
                    }`} />
                    {index < timelineItems.length - 1 && (
                      <div className="w-px h-8 bg-gray-200 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty States */}
      {searchTerm && !application && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              لم يتم العثور على طلب
            </h3>
            <p className="text-gray-600">
              تأكد من صحة رقم الطلب أو رقم الهوية وحاول مرة أخرى
            </p>
          </CardContent>
        </Card>
      )}

      {!searchTerm && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              تتبع حالة طلبك
            </h3>
            <p className="text-gray-600">
              ادخل رقم الطلب أو رقم الهوية في مربع البحث أعلاه لعرض تفاصيل الطلب وسجل التغييرات
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}