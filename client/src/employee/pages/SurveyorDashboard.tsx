import { useState, useRef } from "react";
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
  Map, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Search,
  MapPin,
  Ruler,
  Calculator,
  AlertTriangle,
  Upload,
  Download,
  Eye,
  Clock,
  Target,
  Activity
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
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SurveyReport {
  id: string;
  applicationId: string;
  surveyorId: string;
  findings: {
    coordinates: {
      north: string;
      south: string;
      east: string;
      west: string;
    };
    area: string;
    boundaries: string;
    conflicts: boolean;
    conflictDetails?: string;
    recommendations: string;
  };
  attachments: string[];
  decision: 'approve' | 'reject' | 'require_modification' | null;
  decisionReason: string;
  status: 'draft' | 'completed' | 'submitted';
  createdAt: string;
}

export default function SurveyorDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [surveyData, setSurveyData] = useState({
    coordinates: { north: '', south: '', east: '', west: '' },
    area: '',
    boundaries: '',
    conflicts: false,
    conflictDetails: '',
    recommendations: '',
    decision: '',
    decisionReason: ''
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const surveyorId = '550e8400-e29b-41d4-a716-446655440040'; // Mock surveyor ID

  // Get assigned applications
  const { data: assignedApplications = [], isLoading } = useQuery({
    queryKey: ['/api/applications', { assignedToId: surveyorId, status: 'assigned' }],
  });

  // Get completed applications
  const { data: completedApplications = [] } = useQuery({
    queryKey: ['/api/applications', { assignedToId: surveyorId, status: 'survey_completed' }],
  });

  // Submit survey report mutation
  const submitSurveyMutation = useMutation({
    mutationFn: async ({ 
      applicationId, 
      surveyData 
    }: { 
      applicationId: string; 
      surveyData: any 
    }) => {
      return apiRequest(`/api/applications/${applicationId}/survey-report`, 'POST', {
        surveyorId,
        findings: {
          coordinates: surveyData.coordinates,
          area: surveyData.area,
          boundaries: surveyData.boundaries,
          conflicts: surveyData.conflicts,
          conflictDetails: surveyData.conflictDetails,
          recommendations: surveyData.recommendations
        },
        decision: surveyData.decision,
        decisionReason: surveyData.decisionReason,
        attachments: [] // In real implementation, handle file uploads
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      toast({
        title: "تم تقديم التقرير المساحي بنجاح",
        description: `تم إرسال التقرير المساحي وسيتم إشعار المواطن بالقرار`,
        variant: "default",
      });
      setSelectedApplication(null);
      setSurveyData({
        coordinates: { north: '', south: '', east: '', west: '' },
        area: '',
        boundaries: '',
        conflicts: false,
        conflictDetails: '',
        recommendations: '',
        decision: '',
        decisionReason: ''
      });
      setAttachments([]);
    },
    onError: () => {
      toast({
        title: "خطأ في إرسال التقرير",
        description: "حدث خطأ أثناء إرسال التقرير المساحي، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  });

  const filteredApplications = assignedApplications.filter((app: Application) =>
    app.applicationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.applicationData?.applicantName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAssigned = assignedApplications.length;
  const totalCompleted = completedApplications.length;
  const pendingReview = assignedApplications.filter((app: Application) => 
    !completedApplications.find(completed => completed.id === app.id)
  ).length;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitSurvey = async () => {
    if (!selectedApplication || !surveyData.decision) return;

    await submitSurveyMutation.mutateAsync({
      applicationId: selectedApplication.id,
      surveyData
    });
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'approve':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 ml-1" />موافق</Badge>;
      case 'reject':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 ml-1" />مرفوض</Badge>;
      case 'require_modification':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 ml-1" />يتطلب تعديل</Badge>;
      default:
        return <Badge variant="outline">قيد المراجعة</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">لوحة المهندس المساح</h1>
          <p className="text-muted-foreground">فهد المهندس المساح الأول</p>
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
            <CardTitle className="text-sm font-medium">المعين لي</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalAssigned}</div>
            <p className="text-xs text-muted-foreground">طلب قرار مساحي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في انتظار المراجعة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingReview}</div>
            <p className="text-xs text-muted-foreground">يحتاج مسح ميداني</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتمل</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalCompleted}</div>
            <p className="text-xs text-muted-foreground">تقرير مرسل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الإنجاز</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">نسبة الإنجاز</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="assigned" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assigned" data-testid="tab-assigned-surveys">
            المعين لي ({totalAssigned})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed-surveys">
            المكتمل ({totalCompleted})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم الطلب أو اسم مقدم الطلب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8"
                data-testid="input-search-surveys"
              />
            </div>
          </div>

          {/* Assigned Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>الطلبات المعينة للمسح الميداني</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-6">جاري التحميل...</div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  لا توجد طلبات معينة حالياً
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>مقدم الطلب</TableHead>
                      <TableHead>الموقع</TableHead>
                      <TableHead>نوع المسح</TableHead>
                      <TableHead>تاريخ التعيين</TableHead>
                      <TableHead>الحالة</TableHead>
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
                          <div className="text-sm">
                            <div>{application.applicationData?.plotInfo?.governorate}</div>
                            <div className="text-muted-foreground">
                              {application.applicationData?.plotInfo?.district} - {application.applicationData?.plotInfo?.area}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{application.applicationData?.surveyInfo?.surveyType}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(application.updatedAt).toLocaleDateString('ar-YE')}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800">
                            <Map className="h-3 w-3 ml-1" />
                            جاهز للمسح
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedApplication(application)}
                                data-testid={`button-survey-${application.id}`}
                              >
                                <Ruler className="h-4 w-4 ml-1" />
                                إنشاء تقرير مساحي
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>تقرير المسح الميداني</DialogTitle>
                              </DialogHeader>
                              {selectedApplication && (
                                <div className="space-y-6">
                                  {/* Application Info */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">معلومات الطلب</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>رقم الطلب</Label>
                                        <p className="text-sm font-medium">{selectedApplication.applicationNumber}</p>
                                      </div>
                                      <div>
                                        <Label>مقدم الطلب</Label>
                                        <p className="text-sm">{selectedApplication.applicationData?.applicantName}</p>
                                      </div>
                                      <div>
                                        <Label>رقم قطعة الأرض</Label>
                                        <p className="text-sm">{selectedApplication.applicationData?.plotInfo?.landNumber}</p>
                                      </div>
                                      <div>
                                        <Label>رقم القطعة</Label>
                                        <p className="text-sm">{selectedApplication.applicationData?.plotInfo?.plotNumber}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <Label>الموقع</Label>
                                        <p className="text-sm">
                                          {selectedApplication.applicationData?.plotInfo?.governorate} - 
                                          {selectedApplication.applicationData?.plotInfo?.district} - 
                                          {selectedApplication.applicationData?.plotInfo?.area}
                                        </p>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Survey Data Form */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">نتائج المسح الميداني</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                      {/* Coordinates */}
                                      <div>
                                        <Label className="text-base font-semibold">الإحداثيات</Label>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                          <div>
                                            <Label>الشمال</Label>
                                            <Input
                                              placeholder="إحداثية الشمال"
                                              value={surveyData.coordinates.north}
                                              onChange={(e) => setSurveyData(prev => ({
                                                ...prev,
                                                coordinates: { ...prev.coordinates, north: e.target.value }
                                              }))}
                                              data-testid="input-coordinate-north"
                                            />
                                          </div>
                                          <div>
                                            <Label>الجنوب</Label>
                                            <Input
                                              placeholder="إحداثية الجنوب"
                                              value={surveyData.coordinates.south}
                                              onChange={(e) => setSurveyData(prev => ({
                                                ...prev,
                                                coordinates: { ...prev.coordinates, south: e.target.value }
                                              }))}
                                              data-testid="input-coordinate-south"
                                            />
                                          </div>
                                          <div>
                                            <Label>الشرق</Label>
                                            <Input
                                              placeholder="إحداثية الشرق"
                                              value={surveyData.coordinates.east}
                                              onChange={(e) => setSurveyData(prev => ({
                                                ...prev,
                                                coordinates: { ...prev.coordinates, east: e.target.value }
                                              }))}
                                              data-testid="input-coordinate-east"
                                            />
                                          </div>
                                          <div>
                                            <Label>الغرب</Label>
                                            <Input
                                              placeholder="إحداثية الغرب"
                                              value={surveyData.coordinates.west}
                                              onChange={(e) => setSurveyData(prev => ({
                                                ...prev,
                                                coordinates: { ...prev.coordinates, west: e.target.value }
                                              }))}
                                              data-testid="input-coordinate-west"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Area and Boundaries */}
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>المساحة (متر مربع)</Label>
                                          <Input
                                            placeholder="المساحة الإجمالية"
                                            value={surveyData.area}
                                            onChange={(e) => setSurveyData(prev => ({ ...prev, area: e.target.value }))}
                                            data-testid="input-area"
                                          />
                                        </div>
                                        <div>
                                          <Label>حالة الحدود</Label>
                                          <Select 
                                            value={surveyData.boundaries} 
                                            onValueChange={(value) => setSurveyData(prev => ({ ...prev, boundaries: value }))}
                                          >
                                            <SelectTrigger data-testid="select-boundaries">
                                              <SelectValue placeholder="اختر حالة الحدود" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="واضحة ومحددة">واضحة ومحددة</SelectItem>
                                              <SelectItem value="واضحة جزئياً">واضحة جزئياً</SelectItem>
                                              <SelectItem value="غير واضحة">غير واضحة</SelectItem>
                                              <SelectItem value="متنازع عليها">متنازع عليها</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>

                                      {/* Conflicts Check */}
                                      <div className="space-y-2">
                                        <Label>هل يوجد تعارض مع الأراضي المجاورة؟</Label>
                                        <Select 
                                          value={surveyData.conflicts.toString()} 
                                          onValueChange={(value) => setSurveyData(prev => ({ ...prev, conflicts: value === 'true' }))}
                                        >
                                          <SelectTrigger data-testid="select-conflicts">
                                            <SelectValue placeholder="اختر..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="false">لا يوجد تعارض</SelectItem>
                                            <SelectItem value="true">يوجد تعارض</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Conflict Details (if conflicts exist) */}
                                      {surveyData.conflicts && (
                                        <div>
                                          <Label>تفاصيل التعارض</Label>
                                          <Textarea
                                            placeholder="اشرح تفاصيل التعارض مع الأراضي المجاورة..."
                                            value={surveyData.conflictDetails}
                                            onChange={(e) => setSurveyData(prev => ({ ...prev, conflictDetails: e.target.value }))}
                                            data-testid="textarea-conflict-details"
                                            rows={3}
                                          />
                                        </div>
                                      )}

                                      {/* Recommendations */}
                                      <div>
                                        <Label>التوصيات والملاحظات</Label>
                                        <Textarea
                                          placeholder="أدخل توصياتك وملاحظاتك حول المسح..."
                                          value={surveyData.recommendations}
                                          onChange={(e) => setSurveyData(prev => ({ ...prev, recommendations: e.target.value }))}
                                          data-testid="textarea-recommendations"
                                          rows={4}
                                        />
                                      </div>

                                      {/* File Attachments */}
                                      <div className="space-y-2">
                                        <Label>المرفقات (خرائط، صور، مستندات)</Label>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            data-testid="button-upload-attachment"
                                          >
                                            <Upload className="h-4 w-4 ml-2" />
                                            رفع مرفق
                                          </Button>
                                          <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept=".pdf,.jpg,.jpeg,.png,.dwg"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                          />
                                        </div>
                                        {attachments.length > 0 && (
                                          <div className="space-y-2">
                                            {attachments.map((file, index) => (
                                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                                <span className="text-sm">{file.name}</span>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeAttachment(index)}
                                                >
                                                  <XCircle className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Final Decision */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">القرار النهائي</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                      <div>
                                        <Label>قرار المهندس المساح</Label>
                                        <Select 
                                          value={surveyData.decision} 
                                          onValueChange={(value) => setSurveyData(prev => ({ ...prev, decision: value }))}
                                        >
                                          <SelectTrigger data-testid="select-decision">
                                            <SelectValue placeholder="اختر القرار النهائي" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="approve">الموافقة على إصدار القرار المساحي</SelectItem>
                                            <SelectItem value="require_modification">يتطلب تعديل أو استكمال</SelectItem>
                                            <SelectItem value="reject">رفض الطلب</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label>سبب القرار</Label>
                                        <Textarea
                                          placeholder="اشرح الأسباب التقنية للقرار..."
                                          value={surveyData.decisionReason}
                                          onChange={(e) => setSurveyData(prev => ({ ...prev, decisionReason: e.target.value }))}
                                          data-testid="textarea-decision-reason"
                                          rows={4}
                                        />
                                      </div>
                                    </CardContent>
                                  </Card>

                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      onClick={handleSubmitSurvey}
                                      disabled={submitSurveyMutation.isPending || !surveyData.decision}
                                      className="flex-1"
                                      data-testid="button-submit-survey"
                                    >
                                      <FileText className="h-4 w-4 ml-2" />
                                      {submitSurveyMutation.isPending ? 'جاري الإرسال...' : 'إرسال التقرير المساحي'}
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

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>التقارير المكتملة والمرسلة</CardTitle>
            </CardHeader>
            <CardContent>
              {completedApplications.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  لا توجد تقارير مكتملة حالياً
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>مقدم الطلب</TableHead>
                      <TableHead>القرار</TableHead>
                      <TableHead>تاريخ الإرسال</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedApplications.map((application: Application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.applicationNumber}
                        </TableCell>
                        <TableCell>
                          {application.applicationData?.applicantName || 'غير محدد'}
                        </TableCell>
                        <TableCell>
                          {getDecisionBadge('approve')}
                        </TableCell>
                        <TableCell>
                          {new Date(application.updatedAt).toLocaleDateString('ar-YE')}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" data-testid={`button-view-report-${application.id}`}>
                            <Eye className="h-4 w-4 ml-1" />
                            عرض التقرير
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
      </Tabs>
    </div>
  );
}