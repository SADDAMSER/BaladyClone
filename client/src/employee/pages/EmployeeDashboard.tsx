import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  User, 
  Calendar,
  MessageSquare,
  ArrowRight,
  Filter
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'on_hold';

interface Application {
  id: string;
  applicationNumber: string;
  serviceType: string;
  applicantName: string;
  applicantId: string;
  status: ApplicationStatus;
  currentStage: string;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
}

interface Assignment {
  id: string;
  applicationId: string;
  application: Application;
  assignedAt: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  assignedBy: string;
  notes?: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  under_review: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  on_hold: 'bg-gray-100 text-gray-800 border-gray-200'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export default function EmployeeDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Get user assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/dashboard/my-assignments'],
  });

  // Get notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications', { isRead: false }],
  });

  // Update assignment status
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, status, notes }: { 
      assignmentId: string; 
      status: string; 
      notes?: string; 
    }) => {
      return apiRequest(`/api/assignments/${assignmentId}`, 'PUT', { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/my-assignments'] });
    }
  });

  // Change application status
  const changeStatusMutation = useMutation({
    mutationFn: async ({ 
      applicationId, 
      newStatus, 
      newStage, 
      comments 
    }: { 
      applicationId: string; 
      newStatus: string; 
      newStage: string; 
      comments?: string; 
    }) => {
      return apiRequest(`/api/applications/${applicationId}/status-change`, 'POST', { 
        newStatus, 
        newStage, 
        comments,
        changeReason: 'Employee review' 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/my-assignments'] });
    }
  });

  const assignmentsArray = Array.isArray(assignments) ? assignments as Assignment[] : [];
  
  const filteredAssignments = assignmentsArray.filter((assignment: Assignment) => {
    const statusMatch = statusFilter === 'all' || assignment.application?.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || assignment.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const pendingAssignments = assignmentsArray.filter((a: Assignment) => a.status === 'pending');
  const inProgressAssignments = assignmentsArray.filter((a: Assignment) => a.status === 'in_progress');
  const completedAssignments = assignmentsArray.filter((a: Assignment) => a.status === 'completed');

  const handleStartReview = async (assignmentId: string) => {
    await updateAssignmentMutation.mutateAsync({
      assignmentId,
      status: 'in_progress'
    });
  };

  const handleApproveApplication = async (applicationId: string, assignmentId: string) => {
    await Promise.all([
      changeStatusMutation.mutateAsync({
        applicationId,
        newStatus: 'approved',
        newStage: 'completed',
        comments: 'Application approved after review'
      }),
      updateAssignmentMutation.mutateAsync({
        assignmentId,
        status: 'completed',
        notes: 'Application reviewed and approved'
      })
    ]);
  };

  const handleRejectApplication = async (applicationId: string, assignmentId: string, reason: string) => {
    await Promise.all([
      changeStatusMutation.mutateAsync({
        applicationId,
        newStatus: 'rejected',
        newStage: 'rejected',
        comments: reason
      }),
      updateAssignmentMutation.mutateAsync({
        assignmentId,
        status: 'completed',
        notes: `Application rejected: ${reason}`
      })
    ]);
  };

  const AssignmentCard = ({ assignment }: { assignment: Assignment }) => (
    <Card className="mb-4" data-testid={`assignment-card-${assignment.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">
                {assignment.application?.applicationNumber || assignment.applicationId}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {assignment.application?.serviceType}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={priorityColors[assignment.priority]}>
              {assignment.priority === 'urgent' ? 'عاجل' : 
               assignment.priority === 'high' ? 'عالي' :
               assignment.priority === 'medium' ? 'متوسط' : 'منخفض'}
            </Badge>
            <Badge className={statusColors[assignment.application?.status as ApplicationStatus] || 'bg-gray-100 text-gray-800'}>
              {assignment.application?.status === 'pending' ? 'معلق' :
               assignment.application?.status === 'under_review' ? 'قيد المراجعة' :
               assignment.application?.status === 'approved' ? 'موافق عليه' :
               assignment.application?.status === 'rejected' ? 'مرفوض' : 'متوقف'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>{assignment.application?.applicantName}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(assignment.assignedAt).toLocaleDateString('ar-YE')}</span>
            </div>
          </div>
          
          {assignment.application?.description && (
            <p className="text-sm text-gray-700">
              {assignment.application.description}
            </p>
          )}
          
          <div className="flex items-center justify-between pt-3">
            <div className="flex space-x-2">
              {assignment.status === 'pending' && (
                <Button 
                  onClick={() => handleStartReview(assignment.id)}
                  size="sm"
                  data-testid={`button-start-review-${assignment.id}`}
                >
                  <ArrowRight className="h-4 w-4 ml-1" />
                  بدء المراجعة
                </Button>
              )}
              
              {assignment.status === 'in_progress' && (
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleApproveApplication(assignment.applicationId, assignment.id)}
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700"
                    data-testid={`button-approve-${assignment.id}`}
                  >
                    <CheckCircle className="h-4 w-4 ml-1" />
                    موافقة
                  </Button>
                  <Button 
                    onClick={() => handleRejectApplication(
                      assignment.applicationId, 
                      assignment.id, 
                      'يحتاج إلى مراجعة إضافية'
                    )}
                    size="sm" 
                    variant="destructive"
                    data-testid={`button-reject-${assignment.id}`}
                  >
                    <AlertCircle className="h-4 w-4 ml-1" />
                    رفض
                  </Button>
                </div>
              )}
            </div>
            
            <span className={`text-xs px-2 py-1 rounded-full ${
              assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {assignment.status === 'pending' ? 'معلق' :
               assignment.status === 'in_progress' ? 'جاري العمل' : 'مكتمل'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (assignmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          لوحة تحكم الموظف
        </h1>
        <p className="text-gray-600">
          مراجعة ومعالجة الطلبات المعينة لك
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-gray-900">
                  {pendingAssignments.length}
                </p>
                <p className="text-sm text-gray-600">طلبات معلقة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ArrowRight className="h-8 w-8 text-blue-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-gray-900">
                  {inProgressAssignments.length}
                </p>
                <p className="text-sm text-gray-600">قيد المراجعة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-gray-900">
                  {completedAssignments.length}
                </p>
                <p className="text-sm text-gray-600">مكتملة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-purple-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-gray-900">
                  {Array.isArray(notifications) ? notifications.length : 0}
                </p>
                <p className="text-sm text-gray-600">إشعارات جديدة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="under_review">قيد المراجعة</SelectItem>
                <SelectItem value="approved">موافق عليه</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="on_hold">متوقف</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="تصفية حسب الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                <SelectItem value="urgent">عاجل</SelectItem>
                <SelectItem value="high">عالي</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="low">منخفض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            معلق ({pendingAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            قيد العمل ({inProgressAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            مكتمل ({completedAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingAssignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">لا توجد طلبات معلقة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingAssignments.map((assignment: Assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          {inProgressAssignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ArrowRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">لا توجد طلبات قيد العمل</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {inProgressAssignments.map((assignment: Assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedAssignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">لا توجد طلبات مكتملة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedAssignments.map((assignment: Assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}