import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  PhoneCall,
  MessageSquare,
  Users,
  UserPlus
} from 'lucide-react';
import { useLocation } from 'wouter';

interface Application {
  id: string;
  applicationNumber: string;
  applicantId: string;
  serviceId: string;
  status: string;
  currentStage: string;
  assignedToId: string;
  applicationData: any;
  createdAt: string;
  updatedAt: string;
  // Joined data
  applicantName?: string;
  serviceName?: string;
  engineerName?: string;
}

interface Appointment {
  id: string;
  applicationId: string;
  assignedToId: string;
  scheduledById: string;
  appointmentDate: Date;
  appointmentTime: string;
  contactPhone: string;
  contactNotes: string;
  location: string;
  status: string;
  confirmationStatus: string;
  citizenConfirmed: boolean;
  engineerConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContactAttempt {
  id: string;
  applicationId: string;
  appointmentId?: string;
  attemptedById: string;
  contactMethod: string;
  contactDetails: string;
  attemptResult: string;
  notes: string;
  attemptCount: number;
  isSuccessful: boolean;
  createdAt: string;
}

export default function AssistantManagerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  
  const [scheduleForm, setScheduleForm] = useState({
    assignedToId: '',
    appointmentTime: '',
    contactPhone: '',
    contactNotes: '',
    location: ''
  });

  const [contactForm, setContactForm] = useState({
    contactMethod: 'phone',
    contactDetails: '',
    attemptResult: '',
    notes: ''
  });

  // Fetch assigned applications (waiting for scheduling)
  const { data: assignedApplications, isLoading: loadingApplications } = useQuery({
    queryKey: ['/api/applications', { status: 'assigned', currentStage: 'waiting_scheduling' }],
  });

  // Fetch scheduled appointments
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ['/api/appointments'],
  });

  // Fetch engineers for assignment
  const { data: engineers, isLoading: loadingEngineers } = useQuery({
    queryKey: ['/api/users', { role: 'employee', departmentId: 'survey_dept' }],
  });

  // Fetch contact attempts
  const { data: contactAttempts } = useQuery({
    queryKey: ['/api/contact-attempts'],
  });

  // Schedule appointment mutation
  const scheduleAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/applications/${selectedApplication?.id}/schedule`, 'POST', {
        ...data,
        appointmentDate: selectedDate.toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "تم تحديد الموعد بنجاح",
        description: "تم تحديد موعد المساحة للطلب",
      });
      setIsScheduleDialogOpen(false);
      setScheduleForm({
        assignedToId: '',
        appointmentTime: '',
        contactPhone: '',
        contactNotes: '',
        location: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تحديد الموعد",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  // Contact attempt mutation
  const createContactAttemptMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/contact-attempts', 'POST', {
        ...data,
        applicationId: selectedApplication?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "تم تسجيل محاولة التواصل",
        description: "تم حفظ تفاصيل محاولة التواصل مع المواطن",
      });
      setIsContactDialogOpen(false);
      setContactForm({
        contactMethod: 'phone',
        contactDetails: '',
        attemptResult: '',
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contact-attempts'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تسجيل محاولة التواصل",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfirmationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleScheduleAppointment = () => {
    if (!scheduleForm.assignedToId || !scheduleForm.appointmentTime) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى تعبئة جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    scheduleAppointmentMutation.mutate(scheduleForm);
  };

  const handleCreateContactAttempt = () => {
    if (!contactForm.contactMethod || !contactForm.attemptResult) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى تعبئة جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    createContactAttemptMutation.mutate(contactForm);
  };

  if (loadingApplications || loadingAppointments || loadingEngineers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">لوحة تحكم مساعد رئيس القسم</h1>
          <p className="text-muted-foreground">إدارة المواعيد والتواصل مع المواطنين</p>
        </div>
        <div className="flex items-center space-x-4 space-x-reverse">
          <Button 
            onClick={() => setLocation('/employee/assignment-form')}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-new-assignment"
          >
            <UserPlus className="ml-2 h-4 w-4" />
            تكليف مهندس جديد
          </Button>
          <Badge variant="outline" className="text-lg p-2">
            <Calendar className="h-4 w-4 ml-2" />
            {format(new Date(), 'dd/MM/yyyy', { locale: ar })}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="applications" data-testid="tab-applications">
            <Users className="h-4 w-4 ml-2" />
            الطلبات المعينة
          </TabsTrigger>
          <TabsTrigger value="appointments" data-testid="tab-appointments">
            <CalendarIcon className="h-4 w-4 ml-2" />
            المواعيد المجدولة
          </TabsTrigger>
          <TabsTrigger value="contact" data-testid="tab-contact">
            <PhoneCall className="h-4 w-4 ml-2" />
            محاولات التواصل
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <AlertCircle className="h-4 w-4 ml-2" />
            الإحصائيات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الطلبات في انتظار تحديد الموعد</CardTitle>
              <CardDescription>
                الطلبات التي تم تعيين مهندس لها وتحتاج لتحديد موعد المساحة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {(assignedApplications as Application[] || []).map((application: Application) => (
                  <Card key={application.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-4 space-x-reverse">
                            <Badge variant="outline" data-testid={`app-number-${application.id}`}>
                              {application.applicationNumber}
                            </Badge>
                            <Badge className={getStatusColor(application.status)} data-testid={`app-status-${application.id}`}>
                              {application.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center" data-testid={`app-applicant-${application.id}`}>
                              <User className="h-4 w-4 ml-2" />
                              {application.applicantName || 'غير محدد'}
                            </div>
                            <div className="flex items-center" data-testid={`app-service-${application.id}`}>
                              <MapPin className="h-4 w-4 ml-2" />
                              {application.serviceName || 'خدمة مساحة الأراضي'}
                            </div>
                            <div className="flex items-center" data-testid={`app-engineer-${application.id}`}>
                              <User className="h-4 w-4 ml-2" />
                              المهندس: {application.engineerName || 'غير محدد'}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 space-x-reverse">
                          <Button 
                            onClick={() => {
                              setSelectedApplication(application);
                              setIsScheduleDialogOpen(true);
                            }}
                            data-testid={`button-schedule-${application.id}`}
                          >
                            <CalendarIcon className="h-4 w-4 ml-2" />
                            تحديد موعد
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setSelectedApplication(application);
                              setIsContactDialogOpen(true);
                            }}
                            data-testid={`button-contact-${application.id}`}
                          >
                            <PhoneCall className="h-4 w-4 ml-2" />
                            تواصل
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!(assignedApplications as Application[] || []).length && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد طلبات في انتظار تحديد الموعد
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>المواعيد المجدولة</CardTitle>
              <CardDescription>
                جميع مواعيد المساحة المجدولة مع حالة التأكيد
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {(appointments as Appointment[] || []).map((appointment: Appointment) => (
                  <Card key={appointment.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-4 space-x-reverse">
                            <Badge className={getConfirmationStatusColor(appointment.confirmationStatus)} data-testid={`appointment-status-${appointment.id}`}>
                              {appointment.confirmationStatus}
                            </Badge>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              {appointment.citizenConfirmed && (
                                <Badge variant="outline" className="text-green-600">
                                  <CheckCircle className="h-3 w-3 ml-1" />
                                  مؤكد من المواطن
                                </Badge>
                              )}
                              {appointment.engineerConfirmed && (
                                <Badge variant="outline" className="text-blue-600">
                                  <CheckCircle className="h-3 w-3 ml-1" />
                                  مؤكد من المهندس
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center" data-testid={`appointment-date-${appointment.id}`}>
                              <CalendarIcon className="h-4 w-4 ml-2" />
                              {format(new Date(appointment.appointmentDate), 'dd/MM/yyyy', { locale: ar })}
                            </div>
                            <div className="flex items-center" data-testid={`appointment-time-${appointment.id}`}>
                              <Clock className="h-4 w-4 ml-2" />
                              {appointment.appointmentTime}
                            </div>
                            <div className="flex items-center" data-testid={`appointment-phone-${appointment.id}`}>
                              <Phone className="h-4 w-4 ml-2" />
                              {appointment.contactPhone || 'غير محدد'}
                            </div>
                            <div className="flex items-center" data-testid={`appointment-location-${appointment.id}`}>
                              <MapPin className="h-4 w-4 ml-2" />
                              {appointment.location || 'غير محدد'}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 space-x-reverse">
                          <Button variant="outline" size="sm" data-testid={`button-edit-appointment-${appointment.id}`}>
                            تعديل
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-contact-appointment-${appointment.id}`}>
                            <PhoneCall className="h-4 w-4 ml-2" />
                            تواصل
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!(appointments as Appointment[] || []).length && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد مواعيد مجدولة
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>محاولات التواصل</CardTitle>
              <CardDescription>
                جميع محاولات التواصل مع المواطنين ونتائجها
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {(contactAttempts as ContactAttempt[] || []).map((attempt: ContactAttempt) => (
                  <Card key={attempt.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-4 space-x-reverse">
                            <Badge className={attempt.isSuccessful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} data-testid={`contact-result-${attempt.id}`}>
                              {attempt.isSuccessful ? 'نجح التواصل' : 'فشل التواصل'}
                            </Badge>
                            <Badge variant="outline" data-testid={`contact-method-${attempt.id}`}>
                              {attempt.contactMethod}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div data-testid={`contact-details-${attempt.id}`}>
                              التفاصيل: {attempt.contactDetails}
                            </div>
                            <div data-testid={`contact-result-details-${attempt.id}`}>
                              النتيجة: {attempt.attemptResult}
                            </div>
                            {attempt.notes && (
                              <div data-testid={`contact-notes-${attempt.id}`}>
                                ملاحظات: {attempt.notes}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground" data-testid={`contact-date-${attempt.id}`}>
                              {format(new Date(attempt.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!(contactAttempts as ContactAttempt[] || []).length && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد محاولات تواصل مسجلة
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-total-assignments">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الطلبات المعينة</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(assignedApplications as Application[] || []).length}</div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-scheduled-appointments">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">المواعيد المجدولة</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(appointments as Appointment[] || []).length}</div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-confirmed-appointments">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">المواعيد المؤكدة</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(appointments as Appointment[] || []).filter((apt: Appointment) => apt.confirmationStatus === 'confirmed').length}
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-successful-contacts">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">محاولات التواصل الناجحة</CardTitle>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(contactAttempts as ContactAttempt[] || []).filter((attempt: ContactAttempt) => attempt.isSuccessful).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Schedule Appointment Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تحديد موعد المساحة</DialogTitle>
            <DialogDescription>
              اختر التاريخ والوقت المناسب لموعد المساحة للطلب {selectedApplication?.applicationNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="appointmentDate">تاريخ الموعد</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                  data-testid="calendar-appointment-date"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="assignedToId">المهندس المكلف</Label>
                <Select value={scheduleForm.assignedToId} onValueChange={(value) => setScheduleForm(prev => ({ ...prev, assignedToId: value }))}>
                  <SelectTrigger data-testid="select-engineer">
                    <SelectValue placeholder="اختر المهندس" />
                  </SelectTrigger>
                  <SelectContent>
                    {(engineers as any[] || []).map((engineer: any) => (
                      <SelectItem key={engineer.id} value={engineer.id}>{engineer.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="appointmentTime">وقت الموعد</Label>
                <Select value={scheduleForm.appointmentTime} onValueChange={(value) => setScheduleForm(prev => ({ ...prev, appointmentTime: value }))}>
                  <SelectTrigger data-testid="select-appointment-time">
                    <SelectValue placeholder="اختر الوقت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="08:00">08:00 صباحاً</SelectItem>
                    <SelectItem value="09:00">09:00 صباحاً</SelectItem>
                    <SelectItem value="10:00">10:00 صباحاً</SelectItem>
                    <SelectItem value="11:00">11:00 صباحاً</SelectItem>
                    <SelectItem value="14:00">02:00 مساءً</SelectItem>
                    <SelectItem value="15:00">03:00 مساءً</SelectItem>
                    <SelectItem value="16:00">04:00 مساءً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="contactPhone">رقم الهاتف للتواصل</Label>
                <Input
                  id="contactPhone"
                  placeholder="رقم هاتف المواطن"
                  value={scheduleForm.contactPhone}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                  data-testid="input-contact-phone"
                />
              </div>
              
              <div>
                <Label htmlFor="location">موقع المساحة</Label>
                <Input
                  id="location"
                  placeholder="عنوان أو وصف الموقع"
                  value={scheduleForm.location}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                  data-testid="input-location"
                />
              </div>
              
              <div>
                <Label htmlFor="contactNotes">ملاحظات التواصل</Label>
                <Textarea
                  id="contactNotes"
                  placeholder="أي ملاحظات إضافية للتواصل مع المواطن"
                  value={scheduleForm.contactNotes}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, contactNotes: e.target.value }))}
                  data-testid="textarea-contact-notes"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)} data-testid="button-cancel-schedule">
              إلغاء
            </Button>
            <Button 
              onClick={handleScheduleAppointment}
              disabled={scheduleAppointmentMutation.isPending}
              data-testid="button-confirm-schedule"
            >
              {scheduleAppointmentMutation.isPending ? 'جاري التحديد...' : 'تحديد الموعد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Attempt Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل محاولة تواصل</DialogTitle>
            <DialogDescription>
              سجل تفاصيل محاولة التواصل مع المواطن للطلب {selectedApplication?.applicationNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="contactMethod">طريقة التواصل</Label>
              <Select value={contactForm.contactMethod} onValueChange={(value) => setContactForm(prev => ({ ...prev, contactMethod: value }))}>
                <SelectTrigger data-testid="select-contact-method">
                  <SelectValue placeholder="اختر طريقة التواصل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">مكالمة هاتفية</SelectItem>
                  <SelectItem value="sms">رسالة نصية</SelectItem>
                  <SelectItem value="whatsapp">واتساب</SelectItem>
                  <SelectItem value="email">بريد إلكتروني</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="contactDetails">تفاصيل التواصل</Label>
              <Input
                id="contactDetails"
                placeholder="رقم الهاتف أو البريد الإلكتروني"
                value={contactForm.contactDetails}
                onChange={(e) => setContactForm(prev => ({ ...prev, contactDetails: e.target.value }))}
                data-testid="input-contact-details"
              />
            </div>
            
            <div>
              <Label htmlFor="attemptResult">نتيجة المحاولة</Label>
              <Select value={contactForm.attemptResult} onValueChange={(value) => setContactForm(prev => ({ ...prev, attemptResult: value }))}>
                <SelectTrigger data-testid="select-attempt-result">
                  <SelectValue placeholder="اختر نتيجة المحاولة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">تم التواصل بنجاح</SelectItem>
                  <SelectItem value="no_answer">لا يجيب</SelectItem>
                  <SelectItem value="busy">خط مشغول</SelectItem>
                  <SelectItem value="invalid_number">رقم خاطئ</SelectItem>
                  <SelectItem value="citizen_unavailable">المواطن غير متاح</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="contactAttemptNotes">ملاحظات</Label>
              <Textarea
                id="contactAttemptNotes"
                placeholder="أي ملاحظات حول محاولة التواصل"
                value={contactForm.notes}
                onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="textarea-contact-attempt-notes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)} data-testid="button-cancel-contact">
              إلغاء
            </Button>
            <Button 
              onClick={handleCreateContactAttempt}
              disabled={createContactAttemptMutation.isPending}
              data-testid="button-save-contact"
            >
              {createContactAttemptMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}