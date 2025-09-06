import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileCheck, 
  FileX, 
  Clock, 
  Search,
  CheckCircle,
  Eye,
  FileText,
  AlertTriangle,
  Users
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface Application {
  id: string;
  applicationNumber: string;
  applicantId: string;
  serviceId: string;
  status: string;
  currentStage: string;
  applicationData: any;
  documents: any[];
  fees: string;
  isPaid: boolean;
  createdAt: string;
}

export default function PublicServiceDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "request_docs" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const queryClient = useQueryClient();

  // Get paid applications waiting for document review
  const { data: pendingReview = [], isLoading } = useQuery({
    queryKey: ['/api/applications', { status: 'paid', currentStage: 'payment_confirmed' }],
  });

  // Get applications reviewed today
  const { data: allApplications = [] } = useQuery({
    queryKey: ['/api/applications'],
  });

  // Filter reviewed applications from today
  const reviewedToday = allApplications.filter((app: Application) => {
    const today = new Date().toISOString().split('T')[0];
    const createdDay = new Date(app.createdAt).toISOString().split('T')[0];
    return (app.status === 'document_approved' || app.status === 'document_rejected' || app.status === 'document_review') && createdDay === today;
  });

  // Document review mutation
  const documentReviewMutation = useMutation({
    mutationFn: async ({ 
      applicationId, 
      action, 
      notes 
    }: { 
      applicationId: string; 
      action: string;
      notes: string; 
    }) => {
      return apiRequest(`/api/applications/${applicationId}/document-review`, 'POST', {
        action,
        notes,
        reviewerId: '550e8400-e29b-41d4-a716-446655440020' // Public service employee ID
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      toast({
        title: "تم مراجعة المستندات بنجاح",
        description: `تم ${reviewAction === 'approve' ? 'الموافقة على' : reviewAction === 'reject' ? 'رفض' : 'طلب مستندات إضافية لـ'} الطلب رقم ${selectedApplication?.applicationNumber}`,
        variant: "default",
      });
      setSelectedApplication(null);
      setReviewNotes("");
      setReviewAction("approve");
    },
    onError: () => {
      toast({
        title: "خطأ في مراجعة المستندات",
        description: "حدث خطأ أثناء مراجعة المستندات، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  });

  const filteredApplications = pendingReview.filter((app: Application) =>
    app.applicationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.applicationData?.applicantName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPending = pendingReview.length;
  const totalReviewedToday = reviewedToday.length;
  const approvedToday = reviewedToday.filter((app: Application) => app.status === 'document_approved').length;
  const rejectedToday = reviewedToday.filter((app: Application) => app.status === 'document_rejected').length;

  const handleDocumentReview = async () => {
    if (!selectedApplication) return;

    await documentReviewMutation.mutateAsync({
      applicationId: selectedApplication.id,
      action: reviewAction,
      notes: reviewNotes
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'document_approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 ml-1" />موافق</Badge>;
      case 'document_rejected':
        return <Badge className="bg-red-100 text-red-800"><FileX className="h-3 w-3 ml-1" />مرفوض</Badge>;
      case 'document_review':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 ml-1" />مراجعة</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 ml-1" />في الانتظار</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">لوحة الخدمة العامة</h1>
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
            <CardTitle className="text-sm font-medium">في انتظار المراجعة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalPending}</div>
            <p className="text-xs text-muted-foreground">طلب مدفوع</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تمت مراجعتها اليوم</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalReviewedToday}</div>
            <p className="text-xs text-muted-foreground">طلب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">موافق عليها اليوم</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedToday}</div>
            <p className="text-xs text-muted-foreground">طلب موافق</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرفوضة اليوم</CardTitle>
            <FileX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedToday}</div>
            <p className="text-xs text-muted-foreground">طلب مرفوض</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" data-testid="tab-pending-review">
            في انتظار المراجعة ({totalPending})
          </TabsTrigger>
          <TabsTrigger value="reviewed" data-testid="tab-reviewed-today">
            تمت مراجعتها اليوم ({totalReviewedToday})
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
              <CardTitle>الطلبات المدفوعة في انتظار مراجعة المستندات</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-6">جاري التحميل...</div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  لا توجد طلبات في انتظار مراجعة المستندات
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>مقدم الطلب</TableHead>
                      <TableHead>نوع الخدمة</TableHead>
                      <TableHead>تاريخ الدفع</TableHead>
                      <TableHead>المستندات</TableHead>
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
                          {new Date(application.createdAt).toLocaleDateString('ar-YE')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            <FileText className="h-3 w-3 ml-1" />
                            {application.documents?.length || 0} مستند
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedApplication(application)}
                                data-testid={`button-review-${application.id}`}
                              >
                                <Eye className="h-4 w-4 ml-1" />
                                مراجعة
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>مراجعة المستندات</DialogTitle>
                              </DialogHeader>
                              {selectedApplication && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>رقم الطلب</Label>
                                      <p className="text-sm font-medium">{selectedApplication.applicationNumber}</p>
                                    </div>
                                    <div>
                                      <Label>مقدم الطلب</Label>
                                      <p className="text-sm">{selectedApplication.applicationData?.applicantName}</p>
                                    </div>
                                    <div>
                                      <Label>رقم الهاتف</Label>
                                      <p className="text-sm">{selectedApplication.applicationData?.contactPhone}</p>
                                    </div>
                                    <div>
                                      <Label>الموقع</Label>
                                      <p className="text-sm">{selectedApplication.applicationData?.location}</p>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>تفاصيل الطلب</Label>
                                    <div className="p-4 bg-muted rounded-lg">
                                      <p><strong>نوع المسح:</strong> {selectedApplication.applicationData?.surveyInfo?.surveyType}</p>
                                      <p><strong>الغرض:</strong> {selectedApplication.applicationData?.surveyInfo?.purpose}</p>
                                      <p><strong>رقم قطعة الأرض:</strong> {selectedApplication.applicationData?.plotInfo?.landNumber}</p>
                                      <p><strong>رقم القطعة:</strong> {selectedApplication.applicationData?.plotInfo?.plotNumber}</p>
                                      <p><strong>المساحة المرسومة:</strong> {selectedApplication.applicationData?.surveyInfo?.totalArea} متر مربع</p>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>المستندات المرفقة</Label>
                                    <div className="p-4 bg-muted rounded-lg">
                                      {selectedApplication.documents && selectedApplication.documents.length > 0 ? (
                                        <ul className="space-y-2">
                                          {selectedApplication.documents.map((doc: any, index: number) => (
                                            <li key={index} className="flex items-center gap-2">
                                              <FileText className="h-4 w-4" />
                                              <span>{doc.name || `مستند ${index + 1}`}</span>
                                              <span className="text-muted-foreground">({doc.type})</span>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-muted-foreground">لا توجد مستندات مرفقة</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label>قرار المراجعة</Label>
                                    <Select value={reviewAction} onValueChange={(value: any) => setReviewAction(value)}>
                                      <SelectTrigger data-testid="select-review-action">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="approve">الموافقة على المستندات</SelectItem>
                                        <SelectItem value="request_docs">طلب مستندات إضافية</SelectItem>
                                        <SelectItem value="reject">رفض الطلب</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>ملاحظات المراجعة</Label>
                                    <Textarea
                                      placeholder="أدخل ملاحظات المراجعة..."
                                      value={reviewNotes}
                                      onChange={(e) => setReviewNotes(e.target.value)}
                                      data-testid="textarea-review-notes"
                                      rows={4}
                                    />
                                  </div>

                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      onClick={handleDocumentReview}
                                      disabled={documentReviewMutation.isPending}
                                      className="flex-1"
                                      variant={reviewAction === 'reject' ? 'destructive' : 'default'}
                                      data-testid="button-submit-review"
                                    >
                                      {documentReviewMutation.isPending ? 'جاري المعالجة...' : 
                                        reviewAction === 'approve' ? 'الموافقة' :
                                        reviewAction === 'reject' ? 'رفض الطلب' : 'طلب مستندات'
                                      }
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الطلبات التي تمت مراجعتها اليوم</CardTitle>
            </CardHeader>
            <CardContent>
              {reviewedToday.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  لم تتم مراجعة أي طلبات اليوم بعد
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>مقدم الطلب</TableHead>
                      <TableHead>وقت المراجعة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>المرحلة التالية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewedToday.map((application: Application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.applicationNumber}
                        </TableCell>
                        <TableCell>
                          {application.applicationData?.applicantName || 'غير محدد'}
                        </TableCell>
                        <TableCell>
                          {new Date(application.createdAt).toLocaleString('ar-YE')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(application.status)}
                        </TableCell>
                        <TableCell>
                          {application.status === 'document_approved' && 
                            <Badge variant="outline"><Users className="h-3 w-3 ml-1" />توزيع على المهندسين</Badge>
                          }
                          {application.status === 'document_rejected' && 
                            <Badge variant="destructive">مرفوض نهائياً</Badge>
                          }
                          {application.status === 'document_review' && 
                            <Badge variant="secondary">انتظار استكمال المستندات</Badge>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}