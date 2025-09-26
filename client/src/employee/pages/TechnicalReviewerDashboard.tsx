import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import RealTimeNotifications from '@/components/RealTimeNotifications';
import TechnicalReviewWizard from '@/employee/components/TechnicalReviewWizard';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  BarChart3,
  Eye,
  Search,
  Filter,
  FileText,
  Calendar,
  Users
} from 'lucide-react';

interface TechnicalReviewWorkload {
  pendingReviews: number;
  inProgressReviews: number;
  completedReviews: number;
  rejectedReviews: number;
}

interface ApplicationForReview {
  id: string;
  applicationNumber: string;
  applicantName: string;
  applicantPhone: string;
  projectName: string;
  serviceType: string;
  submissionDate: string;
  assignmentDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending_review' | 'in_progress' | 'completed' | 'rejected';
  deadline?: string;
  location: string;
  hasReviewCase: boolean;
  reviewCaseId?: string;
}

export default function TechnicalReviewerDashboard() {
  const { toast } = useToast();
  
  // Mock reviewer ID - في التطبيق الحقيقي سيأتي من الـ authentication context
  const reviewerId = "reviewer-123"; 
  
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationForReview | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Fetch technical reviewer workload
  const { data: workload, isLoading: workloadLoading } = useQuery<TechnicalReviewWorkload>({
    queryKey: ['/api/technical-reviewer/workload', reviewerId],
    enabled: !!reviewerId
  });

  // Fetch applications requiring technical review
  const { data: applications = [], isLoading: applicationsLoading, refetch: refetchApplications } = useQuery<ApplicationForReview[]>({
    queryKey: ['/api/technical-reviewer/applications', reviewerId],
    enabled: !!reviewerId
  });

  const handleStartReview = (application: ApplicationForReview) => {
    setSelectedApplication(application);
    setIsReviewDialogOpen(true);
  };

  const handleReviewComplete = (decision: 'approved' | 'rejected', notes: string) => {
    toast({
      title: "تم إكمال المراجعة الفنية",
      description: `تم ${decision === 'approved' ? 'قبول' : 'رفض'} الطلب بنجاح`,
      variant: "default"
    });
    
    // إغلاق النافذة وتحديث البيانات
    setIsReviewDialogOpen(false);
    setSelectedApplication(null);
    refetchApplications();
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'pending_review': { label: 'في انتظار المراجعة', variant: 'secondary' },
      'in_progress': { label: 'قيد المراجعة', variant: 'outline' },
      'completed': { label: 'مكتمل', variant: 'default' },
      'rejected': { label: 'مرفوض', variant: 'destructive' }
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'high': { label: 'عالية', variant: 'destructive' },
      'medium': { label: 'متوسطة', variant: 'outline' },
      'low': { label: 'منخفضة', variant: 'secondary' }
    };
    
    const priorityInfo = priorityMap[priority] || { label: priority, variant: 'secondary' as const };
    return <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>;
  };

  if (workloadLoading || applicationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل بيانات المراجع الفني...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                لوحة تحكم المراجع الفني
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                إدارة المراجعات الفنية للطلبات والقرارات المساحية
              </p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <RealTimeNotifications userId={reviewerId} userRole="technical_reviewer" />
              <div className="text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">تاريخ اليوم</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {new Date().toLocaleDateString('ar-SA')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 space-x-reverse">
            {[
              { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
              { id: 'pending', label: 'الطلبات المعلقة', icon: Clock },
              { id: 'in-progress', label: 'قيد المراجعة', icon: FileText },
              { id: 'completed', label: 'المكتملة', icon: CheckCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="ml-2 h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card data-testid="card-pending-reviews">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">المراجعات المعلقة</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workload?.pendingReviews || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    مراجعة في انتظار البدء
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-in-progress-reviews">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workload?.inProgressReviews || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    مراجعة قيد التنفيذ
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-completed-reviews">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">المراجعات المكتملة</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workload?.completedReviews || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    مراجعة مكتملة هذا الشهر
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-rejected-reviews">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">المراجعات المرفوضة</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workload?.rejectedReviews || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    مراجعة مرفوضة هذا الشهر
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="ml-2 h-5 w-5" />
                  الطلبات الحديثة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {applications.slice(0, 5).map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{application.applicantName}</div>
                        <div className="text-sm text-gray-500">
                          {application.projectName} - {application.applicationNumber}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          تم التقديم: {new Date(application.submissionDate).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        {getPriorityBadge(application.priority)}
                        {getStatusBadge(application.status)}
                        <Button 
                          size="sm" 
                          onClick={() => handleStartReview(application)}
                          data-testid={`button-review-${application.id}`}
                        >
                          <Eye className="ml-1 h-4 w-4" />
                          مراجعة
                        </Button>
                      </div>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    <p className="text-gray-500 text-center py-4">لا توجد طلبات للمراجعة</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {(selectedTab === 'pending' || selectedTab === 'in-progress' || selectedTab === 'completed') && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedTab === 'pending' ? 'الطلبات المعلقة' :
                   selectedTab === 'in-progress' ? 'الطلبات قيد المراجعة' : 'الطلبات المكتملة'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-right">الإجراءات</th>
                        <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-right">رقم الطلب</th>
                        <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-right">اسم المستفيد</th>
                        <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-right">المشروع</th>
                        <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-right">نوع الخدمة</th>
                        <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-right">الأولوية</th>
                        <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-right">الحالة</th>
                        <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-right">تاريخ التسليم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications
                        .filter(app => {
                          if (selectedTab === 'pending') return app.status === 'pending_review';
                          if (selectedTab === 'in-progress') return app.status === 'in_progress';
                          if (selectedTab === 'completed') return app.status === 'completed' || app.status === 'rejected';
                          return true;
                        })
                        .map((application, index) => (
                        <tr 
                          key={application.id} 
                          className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600`}
                          data-testid={`application-row-${application.id}`}
                        >
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-3">
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleStartReview(application)}
                              data-testid={`button-start-review-${application.id}`}
                            >
                              <Eye className="ml-1 h-4 w-4" />
                              {application.status === 'pending_review' ? 'بدء المراجعة' : 'عرض التفاصيل'}
                            </Button>
                          </td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 font-medium text-blue-600 dark:text-blue-400">
                            {application.applicationNumber}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-3">
                            {application.applicantName}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-3">
                            {application.projectName}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-3">
                            {application.serviceType}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-3">
                            {getPriorityBadge(application.priority)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-3">
                            {getStatusBadge(application.status)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-3">
                            {new Date(application.assignmentDate).toLocaleDateString('ar-SA')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Technical Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>
              المراجعة الفنية - {selectedApplication?.applicationNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedApplication && (
              <TechnicalReviewWizard
                applicationId={selectedApplication.id}
                reviewCaseId={selectedApplication.reviewCaseId}
                onComplete={handleReviewComplete}
                onClose={() => setIsReviewDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}