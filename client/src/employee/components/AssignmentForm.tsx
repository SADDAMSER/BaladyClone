import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, Clock, FileText, Printer, Save, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AssignmentFormProps {
  applicationId?: string;
  onSave?: (data: AssignmentData) => void;
  onSubmit?: (data: AssignmentData) => void;
  mode?: 'create' | 'edit' | 'view';
}

interface AssignmentData {
  applicationNumber: string;
  citizenName: string;
  citizenPhone: string;
  serviceType: string;
  propertyLocation: string;
  coordinatesLat: number;
  coordinatesLng: number;
  assignedEngineerId: string;
  assignedEngineerName: string;
  appointmentDate: string;
  appointmentTime: string;
  priority: string;
  estimatedDuration: string;
  specialInstructions: string;
  departmentManagerNotes: string;
  approvalStatus: string;
  assignmentReason: string;
}

export default function AssignmentForm({ 
  applicationId, 
  onSave, 
  onSubmit, 
  mode = 'create' 
}: AssignmentFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<AssignmentData>({
    applicationNumber: 'REQ-2024-001234',
    citizenName: 'أحمد محمد الصالح',
    citizenPhone: '+967 777 123 456',
    serviceType: 'مساحة أرض',
    propertyLocation: 'صنعاء - حي الصافية - شارع الجمهورية',
    coordinatesLat: 15.3694,
    coordinatesLng: 44.1910,
    assignedEngineerId: '',
    assignedEngineerName: '',
    appointmentDate: '',
    appointmentTime: '',
    priority: 'عادي',
    estimatedDuration: '4 ساعات',
    specialInstructions: '',
    departmentManagerNotes: '',
    approvalStatus: 'في الانتظار',
    assignmentReason: 'تكليف روتيني حسب طبيعة الخدمة المطلوبة'
  });

  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number} | null>({
    lat: formData.coordinatesLat,
    lng: formData.coordinatesLng
  });

  const engineers = [
    { id: 'eng-001', name: 'م. محمد أحمد السلامي', specialization: 'مساحة أراضي', workload: 'منخفض' },
    { id: 'eng-002', name: 'م. فاطمة علي الهمداني', specialization: 'مساحة أراضي', workload: 'متوسط' },
    { id: 'eng-003', name: 'م. عبدالله حسن الوادعي', specialization: 'مساحة أراضي', workload: 'عالي' },
  ];

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

  const handleSave = () => {
    onSave?.(formData);
    toast({
      title: "تم الحفظ",
      description: "تم حفظ بيانات التكليف بنجاح",
    });
  };

  const handleSubmit = () => {
    onSubmit?.(formData);
    toast({
      title: "تم الإرسال",
      description: "تم إرسال التكليف للمهندس المختص",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getEngineerWorkloadBadge = (workload: string) => {
    const variants = {
      'منخفض': 'default' as const,
      'متوسط': 'secondary' as const,
      'عالي': 'destructive' as const,
    };
    return <Badge variant={variants[workload as keyof typeof variants]}>{workload}</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 print:space-y-4" dir="rtl">
      {/* Print Header */}
      <div className="hidden print:block text-center mb-8">
        <div className="flex justify-between items-center mb-4">
          <img src="/api/placeholder/120/80" alt="شعار الهيئة" className="h-20" />
          <div className="text-center">
            <h1 className="text-2xl font-bold">الجمهورية اليمنية</h1>
            <h2 className="text-xl">الهيئة العامة للمساحة</h2>
            <h3 className="text-lg">إدارة المساحة والتخطيط</h3>
          </div>
          <img src="/api/placeholder/120/80" alt="شعار الجمهورية" className="h-20" />
        </div>
        <h2 className="text-xl font-bold border-b-2 border-gray-800 pb-2">نموذج تكليف مهندس مساحة</h2>
      </div>

      {/* Form Actions - Hide in print */}
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          نموذج تكليف مهندس
        </h1>
        <div className="flex space-x-3 space-x-reverse">
          <Button onClick={handlePrint} variant="outline" data-testid="button-print">
            <Printer className="ml-2 h-4 w-4" />
            طباعة
          </Button>
          <Button onClick={handleSave} variant="outline" data-testid="button-save">
            <Save className="ml-2 h-4 w-4" />
            حفظ
          </Button>
          <Button onClick={handleSubmit} data-testid="button-submit">
            <Send className="ml-2 h-4 w-4" />
            إرسال التكليف
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="ml-2 h-5 w-5" />
              معلومات الطلب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="applicationNumber">رقم الطلب</Label>
                <Input
                  id="applicationNumber"
                  value={formData.applicationNumber}
                  onChange={(e) => handleInputChange('applicationNumber', e.target.value)}
                  className="font-medium text-blue-600"
                  readOnly
                  data-testid="input-application-number"
                />
              </div>
              <div>
                <Label htmlFor="serviceType">نوع الخدمة</Label>
                <Input
                  id="serviceType"
                  value={formData.serviceType}
                  onChange={(e) => handleInputChange('serviceType', e.target.value)}
                  readOnly
                  data-testid="input-service-type"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="citizenName">اسم المستفيد</Label>
                <Input
                  id="citizenName"
                  value={formData.citizenName}
                  onChange={(e) => handleInputChange('citizenName', e.target.value)}
                  readOnly
                  data-testid="input-citizen-name"
                />
              </div>
              <div>
                <Label htmlFor="citizenPhone">رقم الهاتف</Label>
                <Input
                  id="citizenPhone"
                  value={formData.citizenPhone}
                  onChange={(e) => handleInputChange('citizenPhone', e.target.value)}
                  readOnly
                  data-testid="input-citizen-phone"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="propertyLocation">موقع العقار</Label>
              <Input
                id="propertyLocation"
                value={formData.propertyLocation}
                onChange={(e) => handleInputChange('propertyLocation', e.target.value)}
                data-testid="input-property-location"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="coordinates">الإحداثيات (Latitude)</Label>
                <Input
                  id="coordinates"
                  value={formData.coordinatesLat.toString()}
                  onChange={(e) => handleInputChange('coordinatesLat', parseFloat(e.target.value))}
                  type="number"
                  step="0.000001"
                  data-testid="input-coordinates-lat"
                />
              </div>
              <div>
                <Label htmlFor="coordinatesLng">الإحداثيات (Longitude)</Label>
                <Input
                  id="coordinatesLng"
                  value={formData.coordinatesLng.toString()}
                  onChange={(e) => handleInputChange('coordinatesLng', parseFloat(e.target.value))}
                  type="number"
                  step="0.000001"
                  data-testid="input-coordinates-lng"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Map */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="ml-2 h-5 w-5" />
              الخريطة التفاعلية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">انقر على الخريطة لتحديد الموقع</p>
                <p className="text-sm text-gray-400">
                  الموقع الحالي: {selectedLocation?.lat.toFixed(6)}, {selectedLocation?.lng.toFixed(6)}
                </p>
                <Button variant="outline" className="mt-4" data-testid="button-open-map">
                  فتح الخريطة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="ml-2 h-5 w-5" />
            تفاصيل التكليف
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="assignedEngineer">المهندس المكلف</Label>
              <Select value={formData.assignedEngineerId} onValueChange={(value) => {
                handleInputChange('assignedEngineerId', value);
                const engineer = engineers.find(e => e.id === value);
                if (engineer) {
                  handleInputChange('assignedEngineerName', engineer.name);
                }
              }}>
                <SelectTrigger data-testid="select-engineer">
                  <SelectValue placeholder="اختر المهندس" />
                </SelectTrigger>
                <SelectContent>
                  {engineers.map((engineer) => (
                    <SelectItem key={engineer.id} value={engineer.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{engineer.name}</span>
                        {getEngineerWorkloadBadge(engineer.workload)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="appointmentDate">تاريخ الموعد</Label>
              <Input
                id="appointmentDate"
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                data-testid="input-appointment-date"
              />
            </div>

            <div>
              <Label htmlFor="appointmentTime">وقت الموعد</Label>
              <Input
                id="appointmentTime"
                type="time"
                value={formData.appointmentTime}
                onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
                data-testid="input-appointment-time"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">الأولوية</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="عاجل">عاجل</SelectItem>
                  <SelectItem value="مهم">مهم</SelectItem>
                  <SelectItem value="عادي">عادي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estimatedDuration">المدة المقدرة</Label>
              <Select value={formData.estimatedDuration} onValueChange={(value) => handleInputChange('estimatedDuration', value)}>
                <SelectTrigger data-testid="select-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ساعتان">ساعتان</SelectItem>
                  <SelectItem value="4 ساعات">4 ساعات</SelectItem>
                  <SelectItem value="يوم كامل">يوم كامل</SelectItem>
                  <SelectItem value="يومان">يومان</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="assignmentReason">سبب التكليف</Label>
            <Textarea
              id="assignmentReason"
              value={formData.assignmentReason}
              onChange={(e) => handleInputChange('assignmentReason', e.target.value)}
              placeholder="أدخل سبب التكليف..."
              data-testid="textarea-assignment-reason"
            />
          </div>

          <div>
            <Label htmlFor="specialInstructions">تعليمات خاصة</Label>
            <Textarea
              id="specialInstructions"
              value={formData.specialInstructions}
              onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
              placeholder="أي تعليمات خاصة للمهندس..."
              data-testid="textarea-special-instructions"
            />
          </div>

          <div>
            <Label htmlFor="departmentManagerNotes">ملاحظات رئيس القسم</Label>
            <Textarea
              id="departmentManagerNotes"
              value={formData.departmentManagerNotes}
              onChange={(e) => handleInputChange('departmentManagerNotes', e.target.value)}
              placeholder="ملاحظات إضافية من رئيس القسم..."
              data-testid="textarea-manager-notes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Signature Section - Visible in print */}
      <Card className="print:block">
        <CardHeader>
          <CardTitle>التوقيعات والاعتماد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="text-center">
              <div className="border-b-2 border-gray-800 h-16 mb-2"></div>
              <p className="font-bold">مساعد رئيس القسم</p>
              <p className="text-sm text-gray-600">التوقيع والتاريخ</p>
            </div>
            <div className="text-center">
              <div className="border-b-2 border-gray-800 h-16 mb-2"></div>
              <p className="font-bold">رئيس القسم</p>
              <p className="text-sm text-gray-600">التوقيع والاعتماد</p>
            </div>
            <div className="text-center">
              <div className="border-b-2 border-gray-800 h-16 mb-2"></div>
              <p className="font-bold">المهندس المكلف</p>
              <p className="text-sm text-gray-600">التوقيع بالاستلام</p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              تاريخ إنشاء النموذج: {new Date().toLocaleDateString('ar-SA')} | 
              رقم المرجع: {formData.applicationNumber}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}