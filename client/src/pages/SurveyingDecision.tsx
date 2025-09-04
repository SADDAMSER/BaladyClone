import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, Search, Plus, MapPin, FileText, Clock, CheckCircle } from "lucide-react";

export default function SurveyingDecision() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: decisions, isLoading } = useQuery({
    queryKey: ["/api/surveying-decisions"],
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800", 
    completed: "bg-green-100 text-green-800",
    approved: "bg-purple-100 text-purple-800"
  };

  const statusLabels = {
    pending: "في الانتظار",
    in_progress: "قيد التنفيذ",
    completed: "مكتمل",
    approved: "معتمد"
  };

  const mockDecisions = [
    {
      id: "1",
      decisionNumber: "SD-2024-001",
      applicantName: "عبدالله محمد الأحمري",
      plotLocation: "صنعاء - منطقة الصافية",
      plotArea: "500.25",
      status: "in_progress",
      surveyorName: "م. أحمد الوشلي",
      submissionDate: "2024-01-15",
      coordinates: "15.3694° N, 44.1910° E"
    },
    {
      id: "2", 
      decisionNumber: "SD-2024-002",
      applicantName: "نادية سالم الحداد",
      plotLocation: "صنعاء - حي السبعين",
      plotArea: "750.50",
      status: "completed",
      surveyorName: "م. فيصل الشهاري",
      submissionDate: "2024-01-12",
      coordinates: "15.3547° N, 44.2066° E"
    }
  ];

  const workflowSteps = [
    { id: 1, title: "استلام الطلب", description: "تسجيل الطلب في النظام", completed: true },
    { id: 2, title: "التحقق من البيانات", description: "مراجعة المستندات المطلوبة", completed: true },
    { id: 3, title: "تكليف المساح", description: "إسناد المهمة للمهندس المختص", completed: true },
    { id: 4, title: "المسح الميداني", description: "تنفيذ المسح وتحديد الحدود", completed: false },
    { id: 5, title: "إعداد التقرير", description: "توثيق النتائج والتوصيات", completed: false },
    { id: 6, title: "المراجعة والاعتماد", description: "مراجعة التقرير من المدير", completed: false }
  ];

  const displayDecisions = (Array.isArray(decisions) ? decisions : mockDecisions);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
              <Map className="text-secondary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-cairo">القرار المساحي</h1>
              <p className="text-muted-foreground">خدمة إصدار القرارات المساحية الرقمية</p>
            </div>
          </div>
          <Button 
            className="flex items-center space-x-2 space-x-reverse"
            data-testid="button-new-surveying-decision"
          >
            <Plus size={16} />
            <span>قرار مساحي جديد</span>
          </Button>
        </div>

        <Tabs defaultValue="decisions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="decisions" data-testid="tab-decisions">القرارات المساحية</TabsTrigger>
            <TabsTrigger value="workflow" data-testid="tab-workflow">سير العمل</TabsTrigger>
            <TabsTrigger value="map-view" data-testid="tab-map-view">العرض على الخريطة</TabsTrigger>
          </TabsList>

          <TabsContent value="decisions" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-secondary">23</p>
                      <p className="text-muted-foreground text-sm">طلبات جديدة</p>
                    </div>
                    <FileText className="h-8 w-8 text-secondary/60" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">18</p>
                      <p className="text-muted-foreground text-sm">قيد التنفيذ</p>
                    </div>
                    <Clock className="h-8 w-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-accent">156</p>
                      <p className="text-muted-foreground text-sm">قرارات مكتملة</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-accent/60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-secondary">5</p>
                      <p className="text-muted-foreground text-sm">متوسط أيام المعالجة</p>
                    </div>
                    <MapPin className="h-8 w-8 text-secondary/60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">البحث والتصفية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="ابحث برقم القرار، اسم المتقدم، أو الموقع..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                      data-testid="input-search-decisions"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="حالة القرار" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="pending">في الانتظار</SelectItem>
                      <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="approved">معتمد</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" data-testid="button-search-filter">
                    <Search size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Decisions Table */}
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">القرارات المساحية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table data-testid="table-surveying-decisions">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم القرار</TableHead>
                        <TableHead className="text-right">اسم المتقدم</TableHead>
                        <TableHead className="text-right">موقع القطعة</TableHead>
                        <TableHead className="text-right">المساحة</TableHead>
                        <TableHead className="text-right">المساح المختص</TableHead>
                        <TableHead className="text-right">تاريخ التقديم</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayDecisions.map((decision: any) => (
                        <TableRow key={decision.id} data-testid={`row-decision-${decision.id}`}>
                          <TableCell className="font-medium">{decision.decisionNumber}</TableCell>
                          <TableCell>{decision.applicantName}</TableCell>
                          <TableCell>{decision.plotLocation}</TableCell>
                          <TableCell>{decision.plotArea} م²</TableCell>
                          <TableCell>{decision.surveyorName}</TableCell>
                          <TableCell>{decision.submissionDate}</TableCell>
                          <TableCell>
                            <Badge 
                              className={statusColors[decision.status as keyof typeof statusColors]}
                              data-testid={`badge-status-${decision.status}`}
                            >
                              {statusLabels[decision.status as keyof typeof statusLabels]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2 space-x-reverse">
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-view-${decision.id}`}
                              >
                                عرض
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-track-${decision.id}`}
                              >
                                تتبع
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">خطوات سير العمل للقرار المساحي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="workflow-steps">
                  {workflowSteps.map((step, index) => (
                    <div key={step.id} className="flex items-start space-x-4 space-x-reverse">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step.completed 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {step.completed ? (
                          <CheckCircle size={16} />
                        ) : (
                          <span className="text-sm font-medium">{step.id}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      {index < workflowSteps.length - 1 && (
                        <div className="absolute right-4 top-8 w-px h-6 bg-border"></div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map-view" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">العرض على الخريطة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-8 text-center" data-testid="map-placeholder">
                  <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">خريطة تفاعلية</h3>
                  <p className="text-muted-foreground">
                    هنا سيتم عرض الخريطة التفاعلية مع مواقع القطع والحدود المساحية
                  </p>
                  <Button className="mt-4" data-testid="button-load-map">
                    تحميل الخريطة
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
