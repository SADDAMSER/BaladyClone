import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Calendar,
  DollarSign,
  Building,
  Map,
  AlertCircle,
  MessageSquare,
  Download,
  RefreshCw,
  MoreHorizontal,
  Check,
  X,
  Send
} from "lucide-react";

interface PendingApplication {
  id: string;
  applicationNumber: string;
  serviceName: string;
  serviceIcon: string;
  applicantName: string;
  applicantPhone: string;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'under_review' | 'pending_documents' | 'pending_approval';
  currentStep: number;
  totalSteps: number;
  assignee?: string;
  daysRemaining: number;
  fees: string;
  paymentStatus: 'pending' | 'paid';
}

// Mock data for pending applications
const mockPendingApplications: PendingApplication[] = [
  {
    id: "1",
    applicationNumber: "APP-2024-001",
    serviceName: "إصدار رخصة بناء",
    serviceIcon: "Building",
    applicantName: "أحمد محمد الحسني",
    applicantPhone: "967771234567",
    submittedAt: "2024-01-15T10:30:00Z",
    priority: "high",
    status: "under_review",
    currentStep: 2,
    totalSteps: 5,
    assignee: "سارة أحمد",
    daysRemaining: 5,
    fees: "500.00",
    paymentStatus: "paid"
  },
  {
    id: "2",
    applicationNumber: "APP-2024-002",
    serviceName: "إصدار قرار مساحي",
    serviceIcon: "Map",
    applicantName: "فاطمة علي السلمي",
    applicantPhone: "967779876543",
    submittedAt: "2024-01-16T14:20:00Z",
    priority: "medium",
    status: "pending_documents",
    currentStep: 1,
    totalSteps: 4,
    daysRemaining: 2,
    fees: "200.00",
    paymentStatus: "paid"
  },
  {
    id: "3",
    applicationNumber: "APP-2024-003",
    serviceName: "إصدار شهادة إشغال",
    serviceIcon: "FileText",
    applicantName: "محمد عبدالله الزهراني",
    applicantPhone: "967775554433",
    submittedAt: "2024-01-17T09:15:00Z",
    priority: "low",
    status: "submitted",
    currentStep: 1,
    totalSteps: 4,
    daysRemaining: 4,
    fees: "150.00",
    paymentStatus: "paid"
  },
  {
    id: "4",
    applicationNumber: "APP-2024-004",
    serviceName: "إصدار رخصة هدم بناء",
    serviceIcon: "Building",
    applicantName: "نور حسن المالكي",
    applicantPhone: "967772223344",
    submittedAt: "2024-01-18T11:45:00Z",
    priority: "urgent",
    status: "pending_approval",
    currentStep: 4,
    totalSteps: 5,
    assignee: "خالد محمد",
    daysRemaining: 1,
    fees: "300.00",
    paymentStatus: "paid"
  }
];

const priorityConfig = {
  low: { label: "منخفضة", color: "bg-green-500", textColor: "text-green-700" },
  medium: { label: "متوسطة", color: "bg-yellow-500", textColor: "text-yellow-700" },
  high: { label: "عالية", color: "bg-orange-500", textColor: "text-orange-700" },
  urgent: { label: "عاجلة", color: "bg-red-500", textColor: "text-red-700" }
};

const statusConfig = {
  submitted: { label: "تم التقديم", color: "bg-blue-500", icon: FileText },
  under_review: { label: "قيد المراجعة", color: "bg-yellow-500", icon: Clock },
  pending_documents: { label: "بانتظار المستندات", color: "bg-orange-500", icon: AlertCircle },
  pending_approval: { label: "بانتظار الاعتماد", color: "bg-purple-500", icon: CheckCircle }
};

const iconComponents = {
  Building: Building,
  Map: Map,
  FileText: FileText
};

export default function PendingApplications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<PendingApplication | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  // Fetch pending applications
  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/applications/pending", searchQuery, statusFilter, priorityFilter],
    queryFn: () => Promise.resolve(mockPendingApplications)
  });

  // Filter applications based on search and filters
  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || app.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Actions mutations
  const approveApplication = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "تم الاعتماد بنجاح",
        description: "تم اعتماد الطلب وإرسال إشعار للمتقدم",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/pending"] });
      setSelectedApplication(null);
      setActionNotes("");
    }
  });

  const rejectApplication = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "تم رفض الطلب",
        description: "تم رفض الطلب وإرسال إشعار للمتقدم مع سبب الرفض",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/pending"] });
      setSelectedApplication(null);
      setActionNotes("");
    }
  });

  const requestDocuments = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "تم طلب المستندات",
        description: "تم إرسال طلب المستندات الإضافية للمتقدم",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/pending"] });
      setSelectedApplication(null);
      setActionNotes("");
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status: PendingApplication['status']) => {
    return statusConfig[status] || statusConfig.submitted;
  };

  const getPriorityConfig = (priority: PendingApplication['priority']) => {
    return priorityConfig[priority] || priorityConfig.low;
  };

  const getIconComponent = (iconName: string) => {
    return iconComponents[iconName as keyof typeof iconComponents] || FileText;
  };

  const ApplicationCard = ({ application }: { application: PendingApplication }) => {
    const statusConf = getStatusConfig(application.status);
    const priorityConf = getPriorityConfig(application.priority);
    const IconComponent = getIconComponent(application.serviceIcon);
    const StatusIconComponent = statusConf.icon;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="p-2 bg-primary/10 rounded-lg">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{application.serviceName}</CardTitle>
                <p className="text-sm text-muted-foreground">{application.applicationNumber}</p>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge className={`${statusConf.color} text-white text-xs`}>
                {statusConf.label}
              </Badge>
              <Badge variant="outline" className={`text-xs ${priorityConf.textColor}`}>
                {priorityConf.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 space-x-reverse">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{application.applicantName}</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(application.submittedAt)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>متبقي {application.daysRemaining} أيام</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{application.fees} ريال</span>
              <Badge variant={application.paymentStatus === 'paid' ? 'default' : 'destructive'} className="text-xs">
                {application.paymentStatus === 'paid' ? 'مدفوع' : 'معلق'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>تقدم المعالجة</span>
              <span>{application.currentStep}/{application.totalSteps}</span>
            </div>
            <Progress value={(application.currentStep / application.totalSteps) * 100} className="h-1.5" />
          </div>

          {application.assignee && (
            <div className="text-sm text-muted-foreground">
              <strong>المسؤول:</strong> {application.assignee}
            </div>
          )}

          <div className="flex space-x-2 space-x-reverse pt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setSelectedApplication(application)}
                  data-testid={`button-view-application-${application.id}`}
                >
                  <Eye className="h-4 w-4 ml-2" />
                  عرض التفاصيل
                </Button>
              </DialogTrigger>
            </Dialog>
            <Button 
              size="sm" 
              className="flex-1" 
              data-testid={`button-process-application-${application.id}`}
            >
              <StatusIconComponent className="h-4 w-4 ml-2" />
              معالجة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl" data-testid="pending-applications">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">الطلبات المعلقة</h1>
        <p className="text-lg text-muted-foreground">
          إدارة ومعالجة الطلبات المقدمة من المواطنين والمستثمرين
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الطلب أو اسم المتقدم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
                data-testid="input-search-applications"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="submitted">تم التقديم</SelectItem>
                <SelectItem value="under_review">قيد المراجعة</SelectItem>
                <SelectItem value="pending_documents">بانتظار المستندات</SelectItem>
                <SelectItem value="pending_approval">بانتظار الاعتماد</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger data-testid="select-priority-filter">
                <SelectValue placeholder="جميع الأولويات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                <SelectItem value="urgent">عاجلة</SelectItem>
                <SelectItem value="high">عالية</SelectItem>
                <SelectItem value="medium">متوسطة</SelectItem>
                <SelectItem value="low">منخفضة</SelectItem>
              </SelectContent>
            </Select>

            {/* Actions */}
            <div className="flex space-x-2 space-x-reverse">
              <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh-applications">
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
              <Button variant="outline" data-testid="button-export-applications">
                <Download className="h-4 w-4 ml-2" />
                تصدير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {filteredApplications.filter(app => app.priority === 'urgent').length}
                </p>
                <p className="text-sm text-muted-foreground">طلبات عاجلة</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredApplications.filter(app => app.status === 'under_review').length}
                </p>
                <p className="text-sm text-muted-foreground">قيد المراجعة</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredApplications.filter(app => app.status === 'pending_documents').length}
                </p>
                <p className="text-sm text-muted-foreground">بانتظار المستندات</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredApplications.length}
                </p>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-16 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">لا توجد طلبات</h3>
            <p className="text-muted-foreground">لا توجد طلبات تطابق معايير البحث المحددة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}

      {/* Application Detail Dialog */}
      {selectedApplication && (
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 space-x-reverse">
                <FileText className="h-5 w-5" />
                <span>تفاصيل الطلب: {selectedApplication.applicationNumber}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedApplication.serviceName} - {selectedApplication.applicantName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Application Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">معلومات الطلب</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>رقم الطلب:</strong> {selectedApplication.applicationNumber}</div>
                    <div><strong>الخدمة:</strong> {selectedApplication.serviceName}</div>
                    <div><strong>تاريخ التقديم:</strong> {formatDate(selectedApplication.submittedAt)}</div>
                    <div><strong>الرسوم:</strong> {selectedApplication.fees} ريال</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">معلومات المتقدم</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>الاسم:</strong> {selectedApplication.applicantName}</div>
                    <div><strong>الهاتف:</strong> {selectedApplication.applicantPhone}</div>
                  </div>
                </div>
              </div>

              {/* Action Notes */}
              <div className="space-y-3">
                <h4 className="font-semibold">ملاحظات الإجراء</h4>
                <Textarea
                  placeholder="أدخل ملاحظات حول الطلب أو سبب الإجراء..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={4}
                  data-testid="textarea-action-notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 space-x-reverse pt-4 border-t">
                <Button
                  onClick={() => approveApplication.mutate({ id: selectedApplication.id, notes: actionNotes })}
                  disabled={approveApplication.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="button-approve-application"
                >
                  {approveApplication.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  ) : (
                    <Check className="h-4 w-4 ml-2" />
                  )}
                  اعتماد الطلب
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => requestDocuments.mutate({ id: selectedApplication.id, notes: actionNotes })}
                  disabled={requestDocuments.isPending}
                  className="flex-1"
                  data-testid="button-request-documents"
                >
                  {requestDocuments.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2"></div>
                  ) : (
                    <Send className="h-4 w-4 ml-2" />
                  )}
                  طلب مستندات
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => rejectApplication.mutate({ id: selectedApplication.id, notes: actionNotes })}
                  disabled={rejectApplication.isPending}
                  className="flex-1"
                  data-testid="button-reject-application"
                >
                  {rejectApplication.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  ) : (
                    <X className="h-4 w-4 ml-2" />
                  )}
                  رفض الطلب
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}