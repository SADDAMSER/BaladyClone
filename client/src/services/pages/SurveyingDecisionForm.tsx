import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, FileText, Calculator, Save, Send, AlertCircle } from 'lucide-react';
import InteractiveDrawingMap from '@/components/gis/InteractiveDrawingMap';
import { useToast } from '@/hooks/use-toast';

interface SurveyFeature {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'rectangle' | 'circle';
  coordinates: any;
  properties?: {
    name?: string;
    description?: string;
    area?: number;
    length?: number;
  };
}

interface SurveyFormData {
  // معلومات الطلب
  applicantName: string;
  applicantId: string;
  contactPhone: string;
  email: string;
  
  // معلومات الموقع
  governorate: string;
  district: string;
  area: string;
  landNumber: string;
  plotNumber: string;
  coordinates: string;
  
  // نوع القرار المساحي
  surveyType: string;
  purpose: string;
  description: string;
  
  // البيانات الجغرافية
  drawnFeatures: SurveyFeature[];
  totalArea: number;
  totalLength: number;
  
  // المرفقات
  attachments: File[];
}

const governorates = [
  'أمانة العاصمة',
  'عدن',
  'تعز',
  'الحديدة',
  'إب',
  'ذمار',
  'صعدة',
  'حجة',
  'مأرب',
  'الجوف',
  'عمران',
  'صنعاء',
  'البيضاء',
  'لحج',
  'أبين',
  'شبوة',
  'حضرموت',
  'المهرة',
  'سقطرى'
];

const surveyTypes = [
  { value: 'subdivision', label: 'تجزئة أراضي' },
  { value: 'boundary', label: 'تحديد حدود' },
  { value: 'area_calculation', label: 'حساب مساحة' },
  { value: 'topographic', label: 'رفع طبوغرافي' },
  { value: 'cadastral', label: 'مساحة عقارية' },
  { value: 'urban_planning', label: 'تخطيط عمراني' }
];

export default function SurveyingDecisionForm() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<SurveyFormData>({
    applicantName: '',
    applicantId: '',
    contactPhone: '',
    email: '',
    governorate: '',
    district: '',
    area: '',
    landNumber: '',
    plotNumber: '',
    coordinates: '',
    surveyType: '',
    purpose: '',
    description: '',
    drawnFeatures: [],
    totalArea: 0,
    totalLength: 0,
    attachments: []
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleInputChange = (field: keyof SurveyFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleFeatureDrawn = (feature: SurveyFeature) => {
    const updatedFeatures = [...formData.drawnFeatures, feature];
    const totalArea = updatedFeatures.reduce((sum, f) => sum + (f.properties?.area || 0), 0);
    const totalLength = updatedFeatures.reduce((sum, f) => sum + (f.properties?.length || 0), 0);
    
    setFormData(prev => ({
      ...prev,
      drawnFeatures: updatedFeatures,
      totalArea,
      totalLength
    }));
    
    toast({
      title: "تم إضافة معلم جغرافي",
      description: `تم رسم ${feature.type === 'point' ? 'نقطة' : feature.type === 'line' ? 'خط' : 'منطقة'} جديدة على الخريطة`,
      variant: "default",
    });
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // محاكاة إرسال البيانات
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "تم تقديم الطلب بنجاح",
        description: "سيتم مراجعة طلب القرار المساحي والرد عليك خلال 5-7 أيام عمل",
        variant: "default",
      });
      
      // إعادة تعيين النموذج
      setFormData({
        applicantName: '',
        applicantId: '',
        contactPhone: '',
        email: '',
        governorate: '',
        district: '',
        area: '',
        landNumber: '',
        plotNumber: '',
        coordinates: '',
        surveyType: '',
        purpose: '',
        description: '',
        drawnFeatures: [],
        totalArea: 0,
        totalLength: 0,
        attachments: []
      });
      
      setCurrentStep(1);
      
    } catch (error) {
      toast({
        title: "خطأ في التقديم",
        description: "حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.applicantName && formData.applicantId && formData.contactPhone);
      case 2:
        return !!(formData.governorate && formData.district && formData.landNumber);
      case 3:
        return !!(formData.surveyType && formData.purpose);
      case 4:
        return formData.drawnFeatures.length > 0;
      default:
        return true;
    }
  };
  
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إكمال جميع الحقول المطلوبة قبل المتابعة",
        variant: "destructive",
      });
    }
  };
  
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl" data-testid="surveying-decision-form">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">طلب قرار مساحي</h1>
        <p className="text-lg text-muted-foreground">
          تقديم طلب للحصول على قرار مساحي للأراضي والعقارات
        </p>
      </div>
      
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[
            { step: 1, title: 'بيانات المتقدم', icon: FileText },
            { step: 2, title: 'معلومات الموقع', icon: MapPin },
            { step: 3, title: 'نوع القرار', icon: Calculator },
            { step: 4, title: 'الخريطة التفاعلية', icon: MapPin },
            { step: 5, title: 'المراجعة والتأكيد', icon: Send }
          ].map(({ step, title, icon: Icon }) => (
            <div key={step} className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                ${currentStep >= step 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'bg-background border-muted-foreground text-muted-foreground'
                }
              `}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs mt-1 text-center">{title}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Form Content */}
      <Card>
        <CardContent className="p-8">
          {/* Step 1: بيانات المتقدم */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">بيانات المتقدم</h3>
                <p className="text-muted-foreground">أدخل معلوماتك الشخصية ووسائل التواصل</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="applicantName">الاسم الكامل *</Label>
                  <Input
                    id="applicantName"
                    value={formData.applicantName}
                    onChange={(e) => handleInputChange('applicantName', e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    data-testid="input-applicant-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="applicantId">رقم الهوية *</Label>
                  <Input
                    id="applicantId"
                    value={formData.applicantId}
                    onChange={(e) => handleInputChange('applicantId', e.target.value)}
                    placeholder="أدخل رقم الهوية أو الإقامة"
                    data-testid="input-applicant-id"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactPhone">رقم الهاتف *</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    placeholder="967XXXXXXXXX"
                    data-testid="input-contact-phone"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="example@email.com"
                    data-testid="input-email"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: معلومات الموقع */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">معلومات الموقع</h3>
                <p className="text-muted-foreground">حدد موقع الأرض أو العقار المطلوب مسحه</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="governorate">المحافظة *</Label>
                  <Select value={formData.governorate} onValueChange={(value) => handleInputChange('governorate', value)}>
                    <SelectTrigger data-testid="select-governorate">
                      <SelectValue placeholder="اختر المحافظة" />
                    </SelectTrigger>
                    <SelectContent>
                      {governorates.map((gov) => (
                        <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="district">المديرية *</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    placeholder="أدخل اسم المديرية"
                    data-testid="input-district"
                  />
                </div>
                
                <div>
                  <Label htmlFor="area">المنطقة/القرية</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => handleInputChange('area', e.target.value)}
                    placeholder="أدخل اسم المنطقة"
                    data-testid="input-area"
                  />
                </div>
                
                <div>
                  <Label htmlFor="landNumber">رقم القطعة *</Label>
                  <Input
                    id="landNumber"
                    value={formData.landNumber}
                    onChange={(e) => handleInputChange('landNumber', e.target.value)}
                    placeholder="رقم قطعة الأرض"
                    data-testid="input-land-number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="plotNumber">رقم المخطط</Label>
                  <Input
                    id="plotNumber"
                    value={formData.plotNumber}
                    onChange={(e) => handleInputChange('plotNumber', e.target.value)}
                    placeholder="رقم المخطط إن وجد"
                    data-testid="input-plot-number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="coordinates">الإحداثيات</Label>
                  <Input
                    id="coordinates"
                    value={formData.coordinates}
                    onChange={(e) => handleInputChange('coordinates', e.target.value)}
                    placeholder="إحداثيات GPS إن وجدت"
                    data-testid="input-coordinates"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: نوع القرار */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">نوع القرار المساحي</h3>
                <p className="text-muted-foreground">اختر نوع القرار المساحي المطلوب والغرض منه</p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="surveyType">نوع القرار المساحي *</Label>
                  <Select value={formData.surveyType} onValueChange={(value) => handleInputChange('surveyType', value)}>
                    <SelectTrigger data-testid="select-survey-type">
                      <SelectValue placeholder="اختر نوع القرار" />
                    </SelectTrigger>
                    <SelectContent>
                      {surveyTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="purpose">الغرض من القرار *</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                    placeholder="اشرح الغرض من طلب القرار المساحي"
                    rows={3}
                    data-testid="textarea-purpose"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">وصف إضافي</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="أي معلومات إضافية تود إضافتها"
                    rows={3}
                    data-testid="textarea-description"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Step 4: الخريطة التفاعلية */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">تحديد الموقع على الخريطة</h3>
                <p className="text-muted-foreground">استخدم أدوات الرسم لتحديد المنطقة المطلوب مسحها</p>
              </div>
              
              {/* معلومات الرسومات الحالية */}
              {formData.drawnFeatures.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{formData.drawnFeatures.length}</div>
                      <div className="text-sm text-muted-foreground">معلم جغرافي</div>
                    </CardContent>
                  </Card>
                  
                  {formData.totalArea > 0 && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(formData.totalArea / 1000000).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">كيلومتر مربع</div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {formData.totalLength > 0 && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(formData.totalLength / 1000).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">كيلومتر</div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              
              {/* الخريطة التفاعلية */}
              <InteractiveDrawingMap
                onFeatureDrawn={handleFeatureDrawn}
                features={formData.drawnFeatures}
                height="600px"
                isEnabled={true}
              />
              
              {formData.drawnFeatures.length === 0 && (
                <div className="text-center p-8 border border-dashed border-muted-foreground rounded-lg">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-semibold mb-2">لم يتم رسم أي معالم بعد</h4>
                  <p className="text-muted-foreground">
                    استخدم أدوات الرسم أعلاه لتحديد المنطقة المطلوب مسحها على الخريطة
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Step 5: المراجعة والتأكيد */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">مراجعة الطلب</h3>
                <p className="text-muted-foreground">راجع جميع البيانات قبل التقديم النهائي</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* معلومات المتقدم */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      بيانات المتقدم
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>الاسم:</strong> {formData.applicantName}</div>
                    <div><strong>رقم الهوية:</strong> {formData.applicantId}</div>
                    <div><strong>الهاتف:</strong> {formData.contactPhone}</div>
                    {formData.email && <div><strong>البريد:</strong> {formData.email}</div>}
                  </CardContent>
                </Card>
                
                {/* معلومات الموقع */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      معلومات الموقع
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>المحافظة:</strong> {formData.governorate}</div>
                    <div><strong>المديرية:</strong> {formData.district}</div>
                    {formData.area && <div><strong>المنطقة:</strong> {formData.area}</div>}
                    <div><strong>رقم القطعة:</strong> {formData.landNumber}</div>
                    {formData.plotNumber && <div><strong>رقم المخطط:</strong> {formData.plotNumber}</div>}
                  </CardContent>
                </Card>
                
                {/* نوع القرار */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      تفاصيل القرار
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>نوع القرار:</strong> {surveyTypes.find(t => t.value === formData.surveyType)?.label}</div>
                    <div><strong>الغرض:</strong> {formData.purpose}</div>
                    {formData.description && <div><strong>وصف إضافي:</strong> {formData.description}</div>}
                  </CardContent>
                </Card>
                
                {/* البيانات الجغرافية */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      البيانات الجغرافية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>عدد المعالم:</strong> {formData.drawnFeatures.length}</div>
                    {formData.totalArea > 0 && (
                      <div><strong>المساحة الإجمالية:</strong> {Math.round(formData.totalArea / 1000000).toLocaleString()} كم²</div>
                    )}
                    {formData.totalLength > 0 && (
                      <div><strong>الطول الإجمالي:</strong> {Math.round(formData.totalLength / 1000).toLocaleString()} كم</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          variant="outline" 
          onClick={prevStep} 
          disabled={currentStep === 1}
          data-testid="button-previous-step"
        >
          السابق
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(1)}
            data-testid="button-save-draft"
          >
            <Save className="h-4 w-4 ml-2" />
            حفظ مسودة
          </Button>
          
          {currentStep < 5 ? (
            <Button onClick={nextStep} data-testid="button-next-step">
              التالي
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || formData.drawnFeatures.length === 0}
              data-testid="button-submit-form"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
              ) : (
                <Send className="h-4 w-4 ml-2" />
              )}
              تقديم الطلب
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}