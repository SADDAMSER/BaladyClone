import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserCheck, 
  Clock, 
  Search,
  CheckCircle,
  Eye,
  AlertCircle,
  Target,
  Activity,
  ArrowRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import AdvancedAssignmentDialog from '../components/AdvancedAssignmentDialog';

interface Application {
  id: string;
  applicationNumber: string;
  applicantId: string;
  serviceId: string;
  status: string;
  currentStage: string;
  applicationData: any;
  assignedToId: string | null;
  createdAt: string;
}

interface Employee {
  id: string;
  fullName: string;
  role: string;
  email: string;
}

export default function DepartmentManagerDashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get paid applications awaiting assignment
  const { data: pendingAssignment = [], isLoading } = useQuery({
    queryKey: ['/api/applications', { currentStage: 'assigned' }],
    queryFn: async () => {
      const token = localStorage.getItem('employee_token');
      localStorage.setItem("auth-token", token || '');
      
      try {
        const response = await apiRequest('GET', '/api/applications?currentStage=assigned');
        const applications = await response.json();
        return applications;
      } finally {
        localStorage.removeItem("auth-token");
      }
    },
    enabled: true,
    retry: false,
    refetchOnWindowFocus: false
  });

  // Get assigned applications
  const { data: assignedApplications = [] } = useQuery({
    queryKey: ['/api/applications', { status: 'assigned' }],
    queryFn: async () => {
      // Mock assigned applications for now
      return [];
    }
  });

  // Get available surveyors
  const { data: surveyors = [] } = useQuery({
    queryKey: ['/api/users', { role: 'employee' }],
    queryFn: async () => {
      // For now, return mock surveyors - in real implementation this would be from API
      return [
        { id: '550e8400-e29b-41d4-a716-446655440040', fullName: 'فهد المهندس المساح الأول', role: 'employee', email: 'surveyor1@yemen.gov.ye' },
        { id: '550e8400-e29b-41d4-a716-446655440050', fullName: 'سالم المهندس المساح الثاني', role: 'employee', email: 'surveyor2@yemen.gov.ye' }
      ] as Employee[];
    }
  });

  // Assignment mutation
  const assignApplicationMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('employee_token');
      localStorage.setItem("auth-token", token || '');
      
      try {
        const response = await apiRequest('POST', `/api/applications/${data.applicationId}/assign`, {
          assignedToId: data.assignedToId,
          assignmentType: 'specialist',
          departmentId: '550e8400-e29b-41d4-a716-446655440002',
          stage: 'initial_review',
          notes: data.departmentManagerNotes,
          priority: data.priority,
          appointmentDate: data.appointmentDate,
          appointmentTime: data.appointmentTime,
          estimatedDuration: data.estimatedDuration,
          specialInstructions: data.specialInstructions,
          propertyLocation: data.propertyLocation,
          coordinates: data.coordinatesLat && data.coordinatesLng ? {
            lat: data.coordinatesLat,
            lng: data.coordinatesLng
          } : null
        });
        return await response.json();
      } finally {
        localStorage.removeItem("auth-token");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications', { currentStage: 'assigned' }] });
      toast({
        title: "تم تعيين الطلب بنجاح",
        description: `تم تعيين الطلب رقم ${selectedApplication?.applicationNumber} للمهندس المختص مع جميع التفاصيل`,
        variant: "default",
      });
      setSelectedApplication(null);
    },
    onError: () => {
      toast({
        title: "خطأ في تعيين الطلب",
        description: "حدث خطأ أثناء تعيين الطلب، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  });

  const filteredApplications = pendingAssignment.filter((app: Application) =>
    app.applicationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.applicationData?.applicantName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPending = pendingAssignment.length;
  const totalAssigned = assignedApplications.length;
  const assignedToday = assignedApplications.filter((app: Application) => {
    const today = new Date().toISOString().split('T')[0];
    const createdDay = new Date(app.createdAt).toISOString().split('T')[0];
    return createdDay === today;
  }).length;

  // Calculate workload per surveyor
  const surveyorWorkload = surveyors.map((surveyor: Employee) => {
    const assignedCount = assignedApplications.filter((app: Application) => app.assignedToId === surveyor.id).length;
    return {
      ...surveyor,
      assignedCount
    };
  });

  const handleAdvancedAssignment = async (data: any) => {
    // Ensure applicationId is correctly set from selectedApplication
    const assignmentData = {
      ...data,
      applicationId: selectedApplication?.id
    };
    await assignApplicationMutation.mutateAsync(assignmentData);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">عالية</Badge>;
      case 'medium':
        return <Badge variant="secondary">متوسطة</Badge>;
      case 'low':
        return <Badge variant="outline">منخفضة</Badge>;
      default:
        return <Badge variant="outline">غير محدد</Badge>;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4 space-x-reverse">
          <Button
            variant="ghost"
            onClick={() => setLocation('/employee')}
            data-testid="button-back"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للرئيسية
          </Button>
          <div className="border-r border-gray-300 dark:border-gray-600 h-6"></div>
          <h1 className="text-3xl font-bold">لوحة مدير القسم</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('ar-YE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في انتظار التعيين</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalPending}</div>
            <p className="text-xs text-muted-foreground">طلب موافق</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معين للمهندسين</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalAssigned}</div>
            <p className="text-xs text-muted-foreground">طلب معين</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معين اليوم</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{assignedToday}</div>
            <p className="text-xs text-muted-foreground">طلب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المهندسين المتاحين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{surveyors.length}</div>
            <p className="text-xs text-muted-foreground">مهندس مساح</p>
          </CardContent>
        </Card>
      </div>

      {/* Surveyor Workload Overview */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع الأعمال على المهندسين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {surveyorWorkload.map((surveyor: any) => (
              <div key={surveyor.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{surveyor.fullName}</p>
                  <p className="text-sm text-muted-foreground">{surveyor.email}</p>
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold">{surveyor.assignedCount}</div>
                  <div className="text-xs text-muted-foreground">طلب معين</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" data-testid="tab-pending-assignment">
            في انتظار التعيين ({totalPending})
          </TabsTrigger>
          <TabsTrigger value="assigned" data-testid="tab-assigned">
            معين للمهندسين ({totalAssigned})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم الطلب أو اسم مقدم الطلب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8"
                data-testid="input-search-applications"
              />
            </div>
          </div>

          {/* Pending Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>الطلبات الموافق عليها في انتظار التعيين</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-6">جاري التحميل...</div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  لا توجد طلبات في انتظار التعيين
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>مقدم الطلب</TableHead>
                      <TableHead>نوع الخدمة</TableHead>
                      <TableHead>الموقع</TableHead>
                      <TableHead>تاريخ الموافقة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application: Application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.applicationNumber}
                        </TableCell>
                        <TableCell>
                          {application.applicationData?.applicantName || 'غير محدد'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">قرار مساحي</Badge>
                        </TableCell>
                        <TableCell>
                          {application.applicationData?.location || 'غير محدد'}
                        </TableCell>
                        <TableCell>
                          {new Date(application.createdAt).toLocaleDateString('ar-YE')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(application);
                              setAssignmentDialogOpen(true);
                            }}
                            data-testid={`button-assign-${application.id}`}
                          >
                            <UserCheck className="h-4 w-4 ml-1" />
                            تعيين متقدم
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الطلبات المعينة للمهندسين</CardTitle>
            </CardHeader>
            <CardContent>
              {assignedApplications.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  لا توجد طلبات معينة حالياً
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>مقدم الطلب</TableHead>
                      <TableHead>المهندس المسؤول</TableHead>
                      <TableHead>الأولوية</TableHead>
                      <TableHead>تاريخ التعيين</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedApplications.map((application: Application) => {
                      const assignedSurveyor = surveyors.find((s: Employee) => s.id === application.assignedToId);
                      return (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium">
                            {application.applicationNumber}
                          </TableCell>
                          <TableCell>
                            {application.applicationData?.applicantName || 'غير محدد'}
                          </TableCell>
                          <TableCell>
                            {assignedSurveyor?.fullName || 'غير محدد'}
                          </TableCell>
                          <TableCell>
                            {getPriorityBadge('medium')}
                          </TableCell>
                          <TableCell>
                            {new Date(application.createdAt).toLocaleDateString('ar-YE')}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-800">
                              <Activity className="h-3 w-3 ml-1" />
                              قيد المراجعة
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Advanced Assignment Dialog */}
      <AdvancedAssignmentDialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        application={selectedApplication}
        surveyors={surveyors}
        onAssign={handleAdvancedAssignment}
        isLoading={assignApplicationMutation.isPending}
      />
    </div>
  );
}