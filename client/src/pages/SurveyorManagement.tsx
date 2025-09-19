import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search,
  Users,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Map,
  UserCheck,
  Activity,
  Phone,
  Mail,
  Building,
  Eye,
  MoreHorizontal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: {
    code: string;
    nameAr: string;
    nameEn: string;
  };
  department?: {
    nameAr: string;
    nameEn: string;
  };
  position?: {
    nameAr: string;
    nameEn: string;
  };
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface FieldVisit {
  id: string;
  applicationId: string;
  engineerId: string;
  visitDate: string;
  status: string;
  arrivalTime?: string;
  departureTime?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  visitNotes: string;
  citizenPresent: boolean;
  equipmentUsed?: any;
  requiresFollowUp: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  engineer?: {
    fullName: string;
    username: string;
  };
  application?: {
    applicationNumber: string;
    status: string;
  };
}

export default function SurveyorManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSurveyor, setSelectedSurveyor] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with filtering for surveyors
  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Filter for surveyors only (users with surveyor role or specific roles)
  const surveyors = allUsers.filter(user => 
    user.role?.code === 'SURVEYOR' || 
    user.role?.code === 'ENGINEER' ||
    user.role?.nameAr?.includes('مساح') ||
    user.role?.nameEn?.toLowerCase().includes('surveyor') ||
    user.fullName?.includes('مساح')
  );

  // Filter surveyors based on search query
  const filteredSurveyors = surveyors.filter(surveyor =>
    surveyor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surveyor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surveyor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch field visits for selected surveyor
  const { data: surveyorVisits = [], isLoading: visitsLoading } = useQuery<FieldVisit[]>({
    queryKey: ["/api/field-visits/engineer", selectedSurveyor?.id],
    enabled: !!selectedSurveyor?.id,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'completed': { label: 'مكتمل', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      'in_progress': { label: 'قيد التنفيذ', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      'scheduled': { label: 'مجدول', variant: 'default' as const, color: 'bg-yellow-100 text-yellow-800' },
      'cancelled': { label: 'ملغي', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
      { label: status, variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">إدارة المساحين والزيارات الميدانية</h1>
        <p className="text-muted-foreground">عرض وإدارة المساحين ومراقبة الزيارات الميدانية المسجلة</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المساحين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-surveyors">
              {surveyors.length}
            </div>
            <p className="text-xs text-muted-foreground">
              المساحون المسجلون في النظام
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المساحون النشطون</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="active-surveyors">
              {surveyors.filter(s => s.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              المساحون المفعلون حالياً
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الزيارات اليوم</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="today-visits">
              {selectedSurveyor ? surveyorVisits.filter(v => 
                new Date(v.visitDate).toDateString() === new Date().toDateString()
              ).length : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              زيارات ميدانية اليوم
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الزيارات المكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="completed-visits">
              {selectedSurveyor ? surveyorVisits.filter(v => v.status === 'completed').length : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              زيارات مكتملة بنجاح
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* قائمة المساحين */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>قائمة المساحين</CardTitle>
                  <CardDescription>جميع المساحين المسجلين في النظام</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* البحث */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث بالاسم أو اسم المستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                  data-testid="input-search-surveyors"
                />
              </div>

              {/* قائمة المساحين */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {usersLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredSurveyors.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      لا توجد مساحون مطابقون لمعايير البحث
                    </AlertDescription>
                  </Alert>
                ) : (
                  filteredSurveyors.map((surveyor) => (
                    <Card 
                      key={surveyor.id} 
                      className={`cursor-pointer transition-colors hover:bg-accent ${
                        selectedSurveyor?.id === surveyor.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedSurveyor(surveyor)}
                      data-testid={`card-surveyor-${surveyor.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium">{surveyor.fullName}</h4>
                              {surveyor.isActive ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">نشط</Badge>
                              ) : (
                                <Badge variant="secondary">غير نشط</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">@{surveyor.username}</p>
                            <p className="text-xs text-muted-foreground">{surveyor.role?.nameAr}</p>
                            {surveyor.department && (
                              <p className="text-xs text-muted-foreground">{surveyor.department.nameAr}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* تفاصيل المساح المحدد */}
        <div className="lg:col-span-3">
          {selectedSurveyor ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>تفاصيل المساح: {selectedSurveyor.fullName}</CardTitle>
                    <CardDescription>معلومات المساح والزيارات الميدانية</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 ml-2" />
                    عرض التفاصيل الكاملة
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info">معلومات المساح</TabsTrigger>
                    <TabsTrigger value="visits">الزيارات الميدانية</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">الاسم الكامل</label>
                          <p className="text-sm" data-testid="text-surveyor-name">{selectedSurveyor.fullName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">اسم المستخدم</label>
                          <p className="text-sm">@{selectedSurveyor.username}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</label>
                          <p className="text-sm">{selectedSurveyor.email}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">الدور</label>
                          <p className="text-sm">{selectedSurveyor.role?.nameAr}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">القسم</label>
                          <p className="text-sm">{selectedSurveyor.department?.nameAr || 'غير محدد'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">المنصب</label>
                          <p className="text-sm">{selectedSurveyor.position?.nameAr || 'غير محدد'}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="visits" className="space-y-4">
                    {visitsLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : surveyorVisits.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          لا توجد زيارات ميدانية مسجلة لهذا المساح
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">الزيارات الميدانية ({surveyorVisits.length})</h4>
                        </div>
                        
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>رقم الطلب</TableHead>
                              <TableHead>تاريخ الزيارة</TableHead>
                              <TableHead>الحالة</TableHead>
                              <TableHead>الموقع</TableHead>
                              <TableHead>ملاحظات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {surveyorVisits.map((visit) => (
                              <TableRow key={visit.id} data-testid={`row-visit-${visit.id}`}>
                                <TableCell className="font-medium">
                                  {visit.application?.applicationNumber || visit.applicationId.slice(0, 8)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {formatDate(visit.visitDate)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(visit.status)}
                                </TableCell>
                                <TableCell>
                                  {visit.gpsLocation ? (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-xs">
                                        {visit.gpsLocation.latitude.toFixed(4)}, {visit.gpsLocation.longitude.toFixed(4)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">غير محدد</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">
                                    {visit.visitNotes.length > 30 
                                      ? `${visit.visitNotes.slice(0, 30)}...` 
                                      : visit.visitNotes}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-96 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">اختر مساحاً لعرض التفاصيل</h3>
                <p className="text-muted-foreground">
                  قم بالنقر على أي مساح من القائمة على اليسار لعرض معلوماته والزيارات الميدانية المسجلة
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}