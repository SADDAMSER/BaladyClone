import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  FileText, 
  Printer, 
  Save, 
  Send,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Phone,
  Building
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Application {
  id: string;
  applicationNumber: string;
  applicantId: string;
  serviceId: string;
  status: string;
  currentStage: string;
  applicationData: any;
  createdAt: string;
  assignedToId?: string | null;
}

interface Employee {
  id: string;
  fullName: string;
  role: string;
  email: string;
}

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  surveyors: Employee[];
  onAssign: (data: AssignmentData) => Promise<void>;
  isLoading: boolean;
}

interface AssignmentData {
  applicationId: string;
  assignedToId: string;
  appointmentDate: string;
  appointmentTime: string;
  priority: string;
  estimatedDuration: string;
  specialInstructions: string;
  departmentManagerNotes: string;
  propertyLocation: string;
  coordinatesLat?: number;
  coordinatesLng?: number;
}

const mockCoordinates = {
  lat: 15.3694,
  lng: 44.1910
};

export default function AdvancedAssignmentDialog({
  open,
  onOpenChange,
  application,
  surveyors = [],
  onAssign,
  isLoading
}: AssignmentDialogProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<AssignmentData>({
    applicationId: application?.id || '',
    assignedToId: '',
    appointmentDate: '',
    appointmentTime: '',
    priority: 'medium',
    estimatedDuration: '4',
    specialInstructions: '',
    departmentManagerNotes: '',
    propertyLocation: application?.applicationData?.propertyLocation || '',
    coordinatesLat: mockCoordinates.lat,
    coordinatesLng: mockCoordinates.lng
  });

  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number} | null>(
    application ? mockCoordinates : null
  );

  const handleInputChange = (field: keyof AssignmentData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setFormData(prev => ({
      ...prev,
      coordinatesLat: lat,
      coordinatesLng: lng
    }));
  };

  const handleSubmit = async () => {
    if (!formData.assignedToId || !formData.appointmentDate) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى تعبئة جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      await onAssign(formData);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent component
    }
  };

  const resetForm = () => {
    setFormData({
      applicationId: '',
      assignedToId: '',
      appointmentDate: '',
      appointmentTime: '',
      priority: 'medium',
      estimatedDuration: '4',
      specialInstructions: '',
      departmentManagerNotes: '',
      propertyLocation: '',
    });
    setSelectedLocation(null);
  };

  const getEngineerWorkloadBadge = (engineerId: string) => {
    // Mock workload calculation - in real app, this would come from backend
    const mockWorkloads = ['منخفض', 'متوسط', 'عالي'];
    const workload = mockWorkloads[Math.floor(Math.random() * mockWorkloads.length)];
    
    const variants = {
      'منخفض': 'default' as const,
      'متوسط': 'secondary' as const, 
      'عالي': 'destructive' as const,
    };
    return <Badge variant={variants[workload as keyof typeof variants]}>{workload}</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'high': 'text-red-600 dark:text-red-400',
      'medium': 'text-yellow-600 dark:text-yellow-400',
      'low': 'text-green-600 dark:text-green-400'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      'high': 'عالية',
      'medium': 'متوسطة', 
      'low': 'منخفضة'
    };
    return labels[priority as keyof typeof labels] || 'متوسطة';
  };

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto print:max-w-none print:max-h-none" dir="rtl">
        <DialogHeader className="print:hidden">
          <DialogTitle className="text-2xl">
            نموذج تكليف مهندس مساحة - {application.applicationNumber}
          </DialogTitle>
        </DialogHeader>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-8">
          <div className="border-b-2 border-gray-300 pb-4">
            <h1 className="text-2xl font-bold mb-2">الجمهورية اليمنية</h1>
            <h2 className="text-xl mb-2">وزارة الإسكان والتخطيط العمراني</h2>
            <h3 className="text-lg">نموذج تكليف مهندس مساحة</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Right Column - Application Details */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 ml-2" />
                  معلومات الطلب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">رقم الطلب</Label>
                  <p className="text-lg font-semibold">{application.applicationNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">اسم مقدم الطلب</Label>
                  <p className="flex items-center">
                    <User className="h-4 w-4 ml-2 text-gray-500" />
                    {application.applicationData?.applicantName || 'غير محدد'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">نوع الخدمة</Label>
                  <p className="flex items-center">
                    <Building className="h-4 w-4 ml-2 text-gray-500" />
                    مساحة أرض سكنية
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">تاريخ تقديم الطلب</Label>
                  <p className="flex items-center">
                    <Calendar className="h-4 w-4 ml-2 text-gray-500" />
                    {new Date(application.createdAt).toLocaleDateString('ar-YE')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">رقم الهاتف</Label>
                  <p className="flex items-center">
                    <Phone className="h-4 w-4 ml-2 text-gray-500" />
                    {application.applicationData?.phoneNumber || '+967 777 123 456'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">الحالة الحالية</Label>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {application.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Interactive Map Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <MapPin className="h-5 w-5 ml-2" />
                  موقع العقار
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleMapClick(mockCoordinates.lat + Math.random() * 0.01, mockCoordinates.lng + Math.random() * 0.01)}
                >
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500 mb-1">انقر لتحديد الموقع على الخريطة</p>
                    {selectedLocation && (
                      <div className="text-xs text-gray-600">
                        <p>خط الطول: {selectedLocation.lng.toFixed(6)}</p>
                        <p>خط العرض: {selectedLocation.lat.toFixed(6)}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <Label htmlFor="propertyLocation">عنوان الموقع</Label>
                  <Input
                    id="propertyLocation"
                    placeholder="أدخل عنوان أو وصف الموقع"
                    value={formData.propertyLocation}
                    onChange={(e) => handleInputChange('propertyLocation', e.target.value)}
                    data-testid="input-property-location"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Left Column - Assignment Details */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <UserCheck className="h-5 w-5 ml-2" />
                  تفاصيل التكليف
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Engineer Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assignedEngineerId">المهندس المكلف *</Label>
                    <Select value={formData.assignedToId} onValueChange={(value) => handleInputChange('assignedToId', value)}>
                      <SelectTrigger data-testid="select-engineer">
                        <SelectValue placeholder="اختر المهندس المناسب" />
                      </SelectTrigger>
                      <SelectContent>
                        {surveyors.map((engineer: Employee) => (
                          <SelectItem key={engineer.id} value={engineer.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{engineer.fullName}</span>
                              <span className="mr-2">{getEngineerWorkloadBadge(engineer.id)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">أولوية التكليف</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">منخفضة</SelectItem>
                        <SelectItem value="medium">متوسطة</SelectItem>
                        <SelectItem value="high">عالية</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className={`text-sm mt-1 ${getPriorityColor(formData.priority)}`}>
                      الأولوية المحددة: {getPriorityLabel(formData.priority)}
                    </div>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="appointmentDate">تاريخ الموعد *</Label>
                    <Input
                      id="appointmentDate"
                      type="date"
                      value={formData.appointmentDate}
                      onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      data-testid="input-appointment-date"
                    />
                  </div>

                  <div>
                    <Label htmlFor="appointmentTime">وقت الموعد</Label>
                    <Select value={formData.appointmentTime} onValueChange={(value) => handleInputChange('appointmentTime', value)}>
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
                    <Label htmlFor="estimatedDuration">المدة المتوقعة (ساعات)</Label>
                    <Select value={formData.estimatedDuration} onValueChange={(value) => handleInputChange('estimatedDuration', value)}>
                      <SelectTrigger data-testid="select-estimated-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 ساعة</SelectItem>
                        <SelectItem value="4">4 ساعات</SelectItem>
                        <SelectItem value="6">6 ساعات</SelectItem>
                        <SelectItem value="8">8 ساعات (يوم كامل)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Instructions and Notes */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="specialInstructions">تعليمات خاصة للمهندس</Label>
                    <Textarea
                      id="specialInstructions"
                      placeholder="أي تعليمات أو متطلبات خاصة للمهندس المساح..."
                      value={formData.specialInstructions}
                      onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                      rows={3}
                      data-testid="textarea-special-instructions"
                    />
                  </div>

                  <div>
                    <Label htmlFor="departmentManagerNotes">ملاحظات مدير القسم</Label>
                    <Textarea
                      id="departmentManagerNotes"
                      placeholder="ملاحظات إضافية من مدير القسم..."
                      value={formData.departmentManagerNotes}
                      onChange={(e) => handleInputChange('departmentManagerNotes', e.target.value)}
                      rows={3}
                      data-testid="textarea-manager-notes"
                    />
                  </div>
                </div>

                {/* Assignment Summary */}
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-4 space-x-reverse">
                      <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
                      <div className="space-y-1">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">ملخص التكليف</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          سيتم تكليف المهندس المحدد بإجراء مساحة للعقار في الموقع المحدد 
                          وفقاً للموعد والتعليمات المذكورة أعلاه.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            إلغاء
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            data-testid="button-print"
          >
            <Printer className="h-4 w-4 ml-2" />
            طباعة
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading || !formData.assignedToId || !formData.appointmentDate}
            data-testid="button-assign"
            className="bg-green-600 hover:bg-green-700"
          >
            <UserCheck className="h-4 w-4 ml-2" />
            {isLoading ? 'جاري التكليف...' : 'تكليف المهندس'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}