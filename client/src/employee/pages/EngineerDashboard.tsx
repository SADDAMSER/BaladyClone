import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  User,
  FileText,
  Camera,
  BarChart3,
  Navigation,
  Eye,
  Edit,
  Send
} from 'lucide-react';

interface EngineerWorkload {
  upcomingAppointments: number;
  inProgressVisits: number;
  pendingReports: number;
  completedSurveys: number;
}

interface Appointment {
  id: string;
  applicationId: string;
  assignedToId: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  citizenName: string;
  citizenPhone: string;
  location: string;
  notes?: string;
  createdAt: string;
}

interface FieldVisit {
  id: string;
  appointmentId: string;
  applicationId: string;
  engineerId: string;
  visitDate: string;
  visitTime?: string;
  status: string;
  arrivalTime?: string;
  departureTime?: string;
  gpsLocation?: any;
  weatherConditions?: string;
  accessIssues?: string;
  equipmentUsed?: any;
  visitNotes?: string;
  requiresFollowUp: boolean;
  followUpReason?: string;
  citizenPresent: boolean;
  citizenSignature?: string;
  witnessInfo?: any;
  createdAt: string;
  updatedAt: string;
}

interface SurveyResult {
  id: string;
  fieldVisitId: string;
  applicationId: string;
  engineerId: string;
  landArea?: string;
  boundaries?: any;
  measurements?: any;
  landmarks?: any;
  completionStatus: string;
  qualityCheckStatus: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function EngineerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Mock engineer ID - في التطبيق الحقيقي سيأتي من الـ authentication context
  const engineerId = "eng-123"; 
  
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedVisit, setSelectedVisit] = useState<FieldVisit | null>(null);
  const [visitNotes, setVisitNotes] = useState('');
  const [requiresFollowUp, setRequiresFollowUp] = useState(false);
  const [followUpReason, setFollowUpReason] = useState('');

  // Fetch engineer workload
  const { data: workload, isLoading: workloadLoading } = useQuery<EngineerWorkload>({
    queryKey: ['/api/engineer/workload', engineerId],
    enabled: !!engineerId
  });

  // Fetch engineer appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/engineer/appointments', engineerId],
    enabled: !!engineerId
  });

  // Fetch field visits
  const { data: fieldVisits = [], isLoading: visitsLoading } = useQuery<FieldVisit[]>({
    queryKey: ['/api/field-visits/engineer', engineerId],
    enabled: !!engineerId
  });

  // Fetch survey results
  const { data: surveyResults = [], isLoading: resultsLoading } = useQuery<SurveyResult[]>({
    queryKey: ['/api/survey-results', { engineerId }],
    enabled: !!engineerId
  });

  // Confirm appointment mutation
  const confirmAppointmentMutation = useMutation({
    mutationFn: async (data: { appointmentId: string; notes?: string }) => {
      const response = await fetch(`/api/engineer/appointments/${data.appointmentId}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: data.notes })
      });
      if (!response.ok) throw new Error('Failed to confirm appointment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineer/appointments'] });
      toast({
        title: "تم تأكيد الموعد",
        description: "تم تأكيد الموعد بنجاح",
        variant: "default"
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تأكيد الموعد",
        variant: "destructive"
      });
    }
  });

  // Start field visit mutation
  const startVisitMutation = useMutation({
    mutationFn: async (data: { visitId: string; gpsLocation?: any }) => {
      const response = await fetch(`/api/field-visits/${data.visitId}/start`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gpsLocation: data.gpsLocation })
      });
      if (!response.ok) throw new Error('Failed to start visit');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/field-visits/engineer'] });
      toast({
        title: "تم بدء الزيارة",
        description: "تم تسجيل بداية الزيارة الميدانية",
        variant: "default"
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في بدء الزيارة الميدانية",
        variant: "destructive"
      });
    }
  });

  // Complete field visit mutation
  const completeVisitMutation = useMutation({
    mutationFn: async (data: { 
      visitId: string; 
      notes?: string; 
      requiresFollowUp?: boolean;
      followUpReason?: string;
    }) => {
      const response = await fetch(`/api/field-visits/${data.visitId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: data.notes,
          requiresFollowUp: data.requiresFollowUp,
          followUpReason: data.followUpReason
        })
      });
      if (!response.ok) throw new Error('Failed to complete visit');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/field-visits/engineer'] });
      setSelectedVisit(null);
      toast({
        title: "تم إكمال الزيارة",
        description: "تم تسجيل إكمال الزيارة الميدانية",
        variant: "default"
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إكمال الزيارة الميدانية",
        variant: "destructive"
      });
    }
  });

  const handleStartVisit = (visitId: string) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          };
          startVisitMutation.mutate({ visitId, gpsLocation });
        },
        (error) => {
          console.error('GPS Error:', error);
          startVisitMutation.mutate({ visitId });
        }
      );
    } else {
      startVisitMutation.mutate({ visitId });
    }
  };

  const handleCompleteVisit = () => {
    if (!selectedVisit) return;
    
    completeVisitMutation.mutate({
      visitId: selectedVisit.id,
      notes: visitNotes,
      requiresFollowUp,
      followUpReason: requiresFollowUp ? followUpReason : undefined
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'scheduled': { label: 'مجدول', variant: 'secondary' },
      'confirmed': { label: 'مؤكد', variant: 'default' },
      'in_progress': { label: 'قيد التنفيذ', variant: 'outline' },
      'completed': { label: 'مكتمل', variant: 'default' },
      'cancelled': { label: 'ملغي', variant: 'destructive' },
      'rescheduled': { label: 'معاد الجدولة', variant: 'secondary' }
    };
    
    const status_info = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={status_info.variant}>{status_info.label}</Badge>;
  };

  if (workloadLoading || appointmentsLoading || visitsLoading || resultsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل بيانات المهندس...</p>
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
                لوحة تحكم المهندس المكلف
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                إدارة المواعيد والزيارات الميدانية ونتائج المساحة
              </p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
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
              { id: 'appointments', label: 'المواعيد', icon: Calendar },
              { id: 'visits', label: 'الزيارات الميدانية', icon: MapPin },
              { id: 'results', label: 'نتائج المساحة', icon: FileText }
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
              <Card data-testid="card-upcoming-appointments">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">المواعيد القادمة</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workload?.upcomingAppointments || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    موعد في انتظار التأكيد
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-in-progress-visits">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الزيارات الجارية</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workload?.inProgressVisits || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    زيارة قيد التنفيذ
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-pending-reports">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">التقارير المعلقة</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workload?.pendingReports || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    تقرير في انتظار المراجعة
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-completed-surveys">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">المساحات المكتملة</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workload?.completedSurveys || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    مساحة مكتملة هذا الشهر
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Appointments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="ml-2 h-5 w-5" />
                    مواعيد اليوم
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {appointments.slice(0, 3).map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{appointment.citizenName}</div>
                          <div className="text-sm text-gray-500">
                            {appointment.scheduledTime} - {appointment.location}
                          </div>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                    ))}
                    {appointments.length === 0 && (
                      <p className="text-gray-500 text-center py-4">لا توجد مواعيد اليوم</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Active Field Visits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="ml-2 h-5 w-5" />
                    الزيارات النشطة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fieldVisits.filter(v => v.status === 'in_progress').slice(0, 3).map((visit) => (
                      <div key={visit.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">زيارة ميدانية</div>
                          <div className="text-sm text-gray-500">
                            بدأت في: {visit.arrivalTime ? new Date(visit.arrivalTime).toLocaleTimeString('ar-SA') : 'غير محدد'}
                          </div>
                        </div>
                        {getStatusBadge(visit.status)}
                      </div>
                    ))}
                    {fieldVisits.filter(v => v.status === 'in_progress').length === 0 && (
                      <p className="text-gray-500 text-center py-4">لا توجد زيارات نشطة</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {selectedTab === 'appointments' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>المواعيد المكلف بها</CardTitle>
                <CardDescription>
                  إدارة وتأكيد المواعيد الخاصة بك
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`appointment-${appointment.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 space-x-reverse">
                          <div>
                            <div className="font-medium text-lg">{appointment.citizenName}</div>
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <Calendar className="ml-1 h-4 w-4" />
                              {new Date(appointment.scheduledDate).toLocaleDateString('ar-SA')} في {appointment.scheduledTime}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <MapPin className="ml-1 h-4 w-4" />
                              {appointment.location}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <User className="ml-1 h-4 w-4" />
                              {appointment.citizenPhone}
                            </div>
                          </div>
                        </div>
                        {appointment.notes && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                            <strong>ملاحظات:</strong> {appointment.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 space-x-reverse">
                        {getStatusBadge(appointment.status)}
                        {appointment.status === 'scheduled' && (
                          <Button
                            onClick={() => confirmAppointmentMutation.mutate({ appointmentId: appointment.id })}
                            disabled={confirmAppointmentMutation.isPending}
                            size="sm"
                            data-testid={`button-confirm-${appointment.id}`}
                          >
                            <CheckCircle className="ml-1 h-4 w-4" />
                            تأكيد
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {appointments.length === 0 && (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">لا توجد مواعيد مكلف بها</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === 'visits' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الزيارات الميدانية</CardTitle>
                <CardDescription>
                  إدارة الزيارات الميدانية وتسجيل النتائج
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fieldVisits.map((visit) => (
                    <div 
                      key={visit.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`visit-${visit.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">زيارة ميدانية</div>
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <Calendar className="ml-1 h-4 w-4" />
                              {new Date(visit.visitDate).toLocaleDateString('ar-SA')}
                              {visit.visitTime && ` في ${visit.visitTime}`}
                            </div>
                            {visit.arrivalTime && (
                              <div className="text-sm text-gray-500 flex items-center mt-1">
                                <Clock className="ml-1 h-4 w-4" />
                                وصول: {new Date(visit.arrivalTime).toLocaleTimeString('ar-SA')}
                              </div>
                            )}
                            {visit.departureTime && (
                              <div className="text-sm text-gray-500 flex items-center mt-1">
                                <Clock className="ml-1 h-4 w-4" />
                                انصراف: {new Date(visit.departureTime).toLocaleTimeString('ar-SA')}
                              </div>
                            )}
                          </div>
                          {getStatusBadge(visit.status)}
                        </div>
                        
                        {visit.visitNotes && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                            <strong>ملاحظات الزيارة:</strong> {visit.visitNotes}
                          </div>
                        )}
                        
                        {visit.requiresFollowUp && (
                          <Alert className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>تحتاج متابعة:</strong> {visit.followUpReason}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        {visit.status === 'scheduled' && (
                          <Button
                            onClick={() => handleStartVisit(visit.id)}
                            disabled={startVisitMutation.isPending}
                            size="sm"
                            data-testid={`button-start-${visit.id}`}
                          >
                            <Navigation className="ml-1 h-4 w-4" />
                            بدء الزيارة
                          </Button>
                        )}
                        
                        {visit.status === 'in_progress' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => setSelectedVisit(visit)}
                                data-testid={`button-complete-${visit.id}`}
                              >
                                <CheckCircle className="ml-1 h-4 w-4" />
                                إكمال الزيارة
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>إكمال الزيارة الميدانية</DialogTitle>
                                <DialogDescription>
                                  أضف ملاحظات ختامية وحدد ما إذا كانت تحتاج متابعة
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="visit-notes">ملاحظات الزيارة</Label>
                                  <Textarea
                                    id="visit-notes"
                                    value={visitNotes}
                                    onChange={(e) => setVisitNotes(e.target.value)}
                                    placeholder="اكتب ملاحظاتك حول الزيارة..."
                                    rows={3}
                                  />
                                </div>
                                
                                <div className="flex items-center space-x-2 space-x-reverse">
                                  <input
                                    type="checkbox"
                                    id="follow-up"
                                    checked={requiresFollowUp}
                                    onChange={(e) => setRequiresFollowUp(e.target.checked)}
                                    className="rounded"
                                  />
                                  <Label htmlFor="follow-up">تحتاج متابعة</Label>
                                </div>
                                
                                {requiresFollowUp && (
                                  <div>
                                    <Label htmlFor="follow-up-reason">سبب المتابعة</Label>
                                    <Textarea
                                      id="follow-up-reason"
                                      value={followUpReason}
                                      onChange={(e) => setFollowUpReason(e.target.value)}
                                      placeholder="اذكر سبب الحاجة للمتابعة..."
                                      rows={2}
                                    />
                                  </div>
                                )}
                                
                                <div className="flex justify-end space-x-2 space-x-reverse">
                                  <Button
                                    onClick={handleCompleteVisit}
                                    disabled={completeVisitMutation.isPending}
                                  >
                                    <Send className="ml-1 h-4 w-4" />
                                    إكمال الزيارة
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-view-${visit.id}`}
                        >
                          <Eye className="ml-1 h-4 w-4" />
                          عرض التفاصيل
                        </Button>
                      </div>
                    </div>
                  ))}
                  {fieldVisits.length === 0 && (
                    <div className="text-center py-8">
                      <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">لا توجد زيارات ميدانية</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === 'results' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>نتائج المساحة</CardTitle>
                <CardDescription>
                  عرض وإدارة نتائج عمليات المساحة المكتملة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(surveyResults as SurveyResult[]).map((result: SurveyResult) => (
                    <div 
                      key={result.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`result-${result.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">نتيجة مساحة</div>
                            <div className="text-sm text-gray-500">
                              تاريخ الإنشاء: {new Date(result.createdAt).toLocaleDateString('ar-SA')}
                            </div>
                            {result.landArea && (
                              <div className="text-sm text-gray-500">
                                المساحة: {result.landArea} متر مربع
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            {getStatusBadge(result.completionStatus)}
                            {getStatusBadge(result.qualityCheckStatus)}
                          </div>
                        </div>
                        
                        {result.reviewNotes && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                            <strong>ملاحظات المراجعة:</strong> {result.reviewNotes}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-view-result-${result.id}`}
                        >
                          <Eye className="ml-1 h-4 w-4" />
                          عرض النتائج
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-edit-result-${result.id}`}
                        >
                          <Edit className="ml-1 h-4 w-4" />
                          تعديل
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(surveyResults as SurveyResult[]).length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">لا توجد نتائج مساحة</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}