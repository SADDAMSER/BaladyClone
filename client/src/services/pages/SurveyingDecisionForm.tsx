import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Governorate, District } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, FileText, Calculator, Save, Send, AlertCircle, Upload, X, Building2, User, Clock, CheckCircle, Map as MapIcon } from 'lucide-react';
import InteractiveDrawingMap from '@/components/gis/InteractiveDrawingMap';
import InteractiveMap from '@/components/gis/InteractiveMap';
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

// ✅ PHASE 1: Enhanced form data structure
interface SurveyFormData {
  // ✅ Step 1: Applicant Data
  applicantName: string;
  applicantId: string;
  identityType: string;
  contactPhone: string;
  email: string;
  identityImage: File | null;
  applicantRole: string; // صفة مقدم الطلب
  principalName: string; // اسم الموكل (عند الحاجة)
  principalId: string; // رقم هوية الموكل
  
  // ✅ Step 2: Enhanced Location Information
  governorate: string;
  governorateCode: string;
  district: string;
  subDistrict: string; // العزلة
  sector: string; // القطاع
  neighborhoodUnit: string; // وحدة الجوار
  area: string; // منطقة
  landNumber: string;
  plotNumber: string;
  coordinates: string;
  hasGeoTiff: boolean;
  geoTiffFile?: File | null; // ملف GeoTIFF المرفوع
  geoTiffViewer: boolean; // عرض عارض GeoTIFF
  
  // ✅ Step 3: Enhanced Decision Type with Additional Data
  surveyType: string;
  purpose: string;
  description: string;
  // For License Types (نوع رخصة البناء)
  engineerName?: string;
  engineerLicense?: string;
  engineerPhone?: string;
  engineerFile?: File | null;
  buildingType?: string;
  // For Old Drop (إسقاط قديم)
  oldDropYear?: string;
  oldDropNumber?: string;
  oldDropFile?: File | null;
  // For Dispute Settlement (تسوية نزاع)
  disputeParties?: string;
  disputeDescription?: string;
  disputeDate?: string;
  
  // ✅ Step 4: Ownership Data
  locationName: string; // اسم الموضع (اختياري)
  documentType: string;
  ownershipClassification: string;
  ownershipDocument: File | null; // Required
  otherAttachments: File[]; // Optional
  commercialRegistry: File | null; // Required for waqf
  
  // ✅ Step 5: Confirmation (calculated)
  applicationMode: string;
  applicationNumber: string;
  
  // الحقول الموجودة سابقاً
  drawnFeatures: SurveyFeature[];
  totalArea: number;
  totalLength: number;
}

// Fetch real governorates from API using react-query

// ✅ PHASE 1: Updated survey types as per requirements (7 types)
const surveyTypes = [
  { value: 'new_building_license', label: 'إصدار رخصة بناء جديد' },
  { value: 'land_subdivision', label: 'تقسيم أرض' },
  { value: 'zoning_line', label: 'تحديد خط التنظيم' },
  { value: 'consultation', label: 'استشاره' },
  { value: 'old_building_license', label: 'إصدار رخصة بناء قديم' },
  { value: 'old_projection_registration', label: 'تسجيل اسقاط قديم' },
  { value: 'dispute_settlement', label: 'تسوية نزاع' }
];

// ✅ PHASE 1: Identity types
const identityTypes = [
  { value: 'national_id', label: 'بطاقة هوية وطنية' },
  { value: 'residence_permit', label: 'إقامة' },
  { value: 'passport', label: 'جواز سفر' }
];

// ✅ PHASE 1: Document types
const documentTypes = [
  { value: 'religious_deed', label: 'فصل شرعي', classification: 'free' },
  { value: 'insight', label: 'بصيرة', classification: 'free' },
  { value: 'sales_contract', label: 'عقد بيع', classification: 'free' },
  { value: 'possession', label: 'حيازة', classification: 'free' }
];

// ✅ PHASE 1: Ownership classifications
const ownershipClassifications = [
  { value: 'free', label: 'حر' },
  { value: 'waqf', label: 'وقف' }
];

// ✅ PHASE 1: Applicant roles
const applicantRoles = [
  { value: 'self', label: 'عن نفسه' },
  { value: 'agent', label: 'وكيل' },
  { value: 'delegate', label: 'مفوض' },
  { value: 'government', label: 'جهة حكومية' },
  { value: 'private_entity', label: 'جهة خاصة' }
];

// ✅ PHASE 1: Application modes
const applicationModes = [
  { value: 'office', label: 'مسار مكتبي (موظف خدمة الجمهور)' },
  { value: 'portal', label: 'مسار بوابة المواطن (مستقبلي)' }
];

export default function SurveyingDecisionForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch real governorates from API
  const { data: governorates = [], isLoading: isLoadingGovernorates, error: governoratesError } = useQuery<Governorate[]>({
    queryKey: ['/api/governorates'],
  });
  
  // ✅ PHASE 1: Initialize form with new structure
  const [formData, setFormData] = useState<SurveyFormData>({
    // Step 1: Applicant Data
    applicantName: '',
    applicantId: '',
    identityType: '',
    contactPhone: '',
    email: '',
    identityImage: null,
    applicantRole: 'self',
    principalName: '',
    principalId: '',
    
    // Step 2: Enhanced Location Information  
    governorate: '',
    governorateCode: '',
    district: '',
    subDistrict: '',
    sector: '',
    neighborhoodUnit: '',
    area: '',
    landNumber: '',
    plotNumber: '',
    coordinates: '',
    hasGeoTiff: false,
    geoTiffFile: null,
    geoTiffViewer: false,
    
    // Step 3: Enhanced Decision Type
    surveyType: '',
    purpose: '',
    description: '',
    engineerName: '',
    engineerLicense: '',
    engineerPhone: '',
    engineerFile: null,
    buildingType: '',
    oldDropYear: '',
    oldDropNumber: '',
    oldDropFile: null,
    disputeParties: '',
    disputeDescription: '',
    disputeDate: '',
    
    // Step 4: Ownership Data
    locationName: '',
    documentType: '',
    ownershipClassification: 'free',
    ownershipDocument: null,
    otherAttachments: [],
    commercialRegistry: null,
    
    // Step 5: Confirmation
    applicationMode: 'office',
    applicationNumber: '',
    
    // Geographic data
    drawnFeatures: [],
    totalArea: 0,
    totalLength: 0
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ PHASE 1: Enhanced cascading geographic queries
  const { data: districts = [], isLoading: isLoadingDistricts, error: districtsError } = useQuery<District[]>({
    queryKey: ['/api/districts', { governorateId: formData.governorate }],
    enabled: !!formData.governorate,
  });

  // Fetch sub-districts (العزلة) based on selected district
  const { data: subDistricts = [], isLoading: isLoadingSubDistricts, error: subDistrictsError } = useQuery<any[]>({
    queryKey: ['/api/sub-districts', { districtId: formData.district }],
    enabled: !!formData.district,
  });

  // Fetch sectors (القطاع) based on selected sub-district
  const { data: sectors = [], isLoading: isLoadingSectors, error: sectorsError } = useQuery<any[]>({
    queryKey: ['/api/sectors', { subDistrictId: formData.subDistrict }],
    enabled: !!formData.subDistrict,
  });

  // Fetch neighborhood units (وحدة الجوار) based on selected sector
  const { data: neighborhoodUnits = [], isLoading: isLoadingNeighborhoodUnits, error: neighborhoodUnitsError } = useQuery<any[]>({
    queryKey: ['/api/neighborhood-units', { sectorId: formData.sector }],
    enabled: !!formData.sector,
  });

  // Create application mutation
  const createApplicationMutation = useMutation({
    mutationFn: async (applicationData: any) => {
      const response = await apiRequest('POST', '/api/applications', applicationData);
      return await response.json();
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      // Try to auto-assign the application
      try {
        await apiRequest('POST', `/api/applications/${data.id}/auto-assign`, {});
      } catch (error) {
        console.log('Auto-assignment failed, will be done manually:', error);
      }
      
      toast({
        title: "تم تقديم الطلب بنجاح",
        description: `تم إنشاء طلب القرار المساحي برقم: ${data.applicationNumber || data.id}. سيتم مراجعته من قبل الفريق المختص.`,
        variant: "default",
      });
      
      // Reset form after successful submission
      setFormData({
        // Step 1: Applicant Data
        applicantName: '',
        applicantId: '',
        identityType: '',
        contactPhone: '',
        email: '',
        identityImage: null,
        applicantRole: 'self',
        principalName: '',
        principalId: '',
        
        // Step 2: Enhanced Location Information  
        governorate: '',
        governorateCode: '',
        district: '',
        subDistrict: '',
        sector: '',
        neighborhoodUnit: '',
        area: '',
        landNumber: '',
        plotNumber: '',
        coordinates: '',
        hasGeoTiff: false,
        geoTiffFile: null,
        geoTiffViewer: false,
        
        // Step 3: Decision Type
        surveyType: '',
        purpose: '',
        description: '',
        engineerName: '',
        engineerLicense: '',
        engineerFile: null,
        
        // Step 4: Ownership Data
        locationName: '',
        documentType: '',
        ownershipClassification: 'free',
        ownershipDocument: null,
        otherAttachments: [],
        commercialRegistry: null,
        
        // Step 5: Confirmation
        applicationMode: 'office',
        applicationNumber: '',
        
        // Geographic data
        drawnFeatures: [],
        totalArea: 0,
        totalLength: 0
      });
      setCurrentStep(1);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تقديم الطلب",
        description: error.message || "حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    },
  });
  
  const handleInputChange = (field: keyof SurveyFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ✅ PHASE 1: Enhanced cascading change handlers
  const handleGovernorateChange = (value: string) => {
    const selectedGov = governorates.find(gov => gov.id === value);
    setFormData(prev => ({
      ...prev,
      governorate: value,
      governorateCode: selectedGov?.code || '',
      district: '', // Clear all dependent fields
      subDistrict: '',
      sector: '',
      neighborhoodUnit: '',
    }));
  };

  const handleDistrictChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      district: value,
      subDistrict: '', // Clear all dependent fields
      sector: '',
      neighborhoodUnit: '',
    }));
  };

  const handleSubDistrictChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      subDistrict: value,
      sector: '', // Clear dependent fields
      neighborhoodUnit: '',
    }));
  };

  const handleSectorChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      sector: value,
      neighborhoodUnit: '', // Clear dependent field
    }));
  };

  // Set coordinates from map
  const handleSetCoordinatesFromMap = () => {
    // Enable coordinate selection mode
    setIsSelectingCoordinates(true);
    toast({
      title: "وضع تحديد الإحداثيات مُفعل",
      description: "انقر على الخريطة لتحديد الإحداثيات",
      variant: "default",
    });
  };

  // Add state for coordinate selection mode
  const [isSelectingCoordinates, setIsSelectingCoordinates] = useState(false);
  
  // ✅ PHASE 1: Step 3 Modal states
  const [showSurveyTypeModal, setShowSurveyTypeModal] = useState(false);
  const [selectedSurveyTypeDetails, setSelectedSurveyTypeDetails] = useState<any>(null);
  
  // ✅ PHASE 1: Step 4 Enhanced file upload states
  const [fileUploadErrors, setFileUploadErrors] = useState<{[key: string]: string}>({});
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  const handleLocationSelect = (coordinates: { lat: number; lng: number }) => {
    const coordinatesString = `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
    setFormData(prev => ({
      ...prev,
      coordinates: coordinatesString
    }));
    
    // Disable coordinate selection mode after selection
    setIsSelectingCoordinates(false);
    
    toast({
      title: "تم تحديد الموقع",
      description: `تم تحديث الإحداثيات: ${coordinatesString}`,
      variant: "default",
    });
  };

  // ✅ PHASE 1: Enhanced file validation functions
  const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  };

  const validateFileType = (file: File, allowedTypes: string[]): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return allowedTypes.includes(fileExtension);
  };

  const handleFileUpload = (
    file: File | File[] | null, 
    fieldName: string, 
    options: {
      maxSizeMB?: number;
      allowedTypes?: string[];
      multiple?: boolean;
    } = {}
  ) => {
    const { maxSizeMB = 10, allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'], multiple = false } = options;
    
    // Clear previous errors
    setFileUploadErrors(prev => ({
      ...prev,
      [fieldName]: ''
    }));

    if (!file) {
      handleInputChange(fieldName, null);
      return;
    }

    const files = Array.isArray(file) ? file : [file];
    
    // Validate each file
    for (const singleFile of files) {
      if (!validateFileSize(singleFile, maxSizeMB)) {
        setFileUploadErrors(prev => ({
          ...prev,
          [fieldName]: `حجم الملف ${singleFile.name} كبير جداً. الحد الأقصى ${maxSizeMB}MB`
        }));
        return;
      }

      if (!validateFileType(singleFile, allowedTypes)) {
        setFileUploadErrors(prev => ({
          ...prev,
          [fieldName]: `نوع الملف ${singleFile.name} غير مدعوم. الأنواع المسموحة: ${allowedTypes.join(', ')}`
        }));
        return;
      }
    }

    // If all validations pass
    const result = multiple ? files : files[0];
    handleInputChange(fieldName, result);
    
    toast({
      title: "تم رفع الملف بنجاح",
      description: `تم رفع ${files.length} ملف${files.length > 1 ? 'ات' : ''}`,
      variant: "default",
    });
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
    if (!validateStep(4) || formData.drawnFeatures.length === 0) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى التأكد من رسم المعالم الجغرافية على الخريطة",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // إنشاء UUID للطلب
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const applicationData = {
      serviceId: '550e8400-e29b-41d4-a716-446655440001', // خدمة قرار مساحي
      applicantId: '550e8400-e29b-41d4-a716-446655440000', // مستخدم اختبار ثابت
      status: 'submitted',
      currentStage: 'submitted',
      applicationData: {
        applicantName: formData.applicantName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.email,
        description: `طلب قرار مساحي - ${formData.purpose}`,
        location: `${formData.governorate} - ${formData.district} - ${formData.area}`,
        plotInfo: {
          landNumber: formData.landNumber,
          plotNumber: formData.plotNumber,
          governorate: formData.governorateCode, // Use code for display/storage
          district: formData.district,
          area: formData.area,
          coordinates: formData.coordinates,
        },
        surveyInfo: {
          surveyType: formData.surveyType,
          purpose: formData.purpose,
          description: formData.description,
          drawnFeatures: formData.drawnFeatures,
          totalArea: formData.totalArea,
          totalLength: formData.totalLength,
        },
        serviceType: 'surveying_decision', // نحتفظ بهذا للمنطق الداخلي
      },
      documents: formData.otherAttachments.map((file: File) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
      fees: "50000.00", // رسوم افتراضية - سيتم حسابها لاحقاً
    };

    try {
      await createApplicationMutation.mutateAsync(applicationData);
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ✅ PHASE 1: Enhanced validation logic
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // بيانات المتقدم
        const basicValid = !!(formData.applicantName && formData.applicantId && formData.identityType && formData.contactPhone);
        // Additional validation for agent/delegate roles
        if (formData.applicantRole === 'agent' || formData.applicantRole === 'delegate') {
          return basicValid && !!(formData.principalName && formData.principalId);
        }
        return basicValid;
        
      case 2: // معلومات الموقع
        return !!(formData.governorate && formData.district && formData.landNumber);
        
      case 3: // نوع القرار
        const typeValid = !!(formData.surveyType && formData.purpose);
        // Additional validation for old building/projection
        if (formData.surveyType === 'old_building_license' || formData.surveyType === 'old_projection_registration') {
          return typeValid && !!(formData.engineerName && formData.engineerLicense && formData.engineerFile);
        }
        return typeValid;
        
      case 4: // بيانات الملكية
        const ownershipValid = !!(formData.documentType && formData.ownershipDocument);
        // Commercial registry required for waqf
        if (formData.ownershipClassification === 'waqf') {
          return ownershipValid && !!formData.commercialRegistry;
        }
        return ownershipValid;
        
      case 5: // تأكيد الطلب
        return true; // All previous validations passed
        
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
            { step: 4, title: 'بيانات الملكية', icon: FileText },
            { step: 5, title: 'تأكيد الطلب', icon: Send }
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
          {/* ✅ PHASE 1 STEP 1: Enhanced Applicant Data */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">بيانات المتقدم</h3>
                <p className="text-muted-foreground">أدخل معلوماتك الشخصية ووسائل التواصل</p>
              </div>
              
              {/* Application Mode Selection */}
              <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                <Label className="text-base font-semibold mb-3 block">مسار الطلب</Label>
                <Select value={formData.applicationMode} onValueChange={(value) => handleInputChange('applicationMode', value)}>
                  <SelectTrigger data-testid="select-application-mode">
                    <SelectValue placeholder="اختر مسار الطلب" />
                  </SelectTrigger>
                  <SelectContent>
                    {applicationModes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="applicantName">الاسم الكامل *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="applicantName"
                      value={formData.applicantName}
                      onChange={(e) => handleInputChange('applicantName', e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      data-testid="input-applicant-name"
                    />
                    <Input
                      value={formData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                      placeholder="رقم الهاتف"
                      className="w-48"
                      data-testid="input-contact-phone"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">حقول بحث ذكية - تعبئة تلقائية إن وُجد</p>
                </div>
                
                <div>
                  <Label htmlFor="identityType">نوع الهوية *</Label>
                  <Select value={formData.identityType} onValueChange={(value) => handleInputChange('identityType', value)}>
                    <SelectTrigger data-testid="select-identity-type">
                      <SelectValue placeholder="اختر نوع الهوية" />
                    </SelectTrigger>
                    <SelectContent>
                      {identityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="applicantId">رقم الهوية *</Label>
                  <Input
                    id="applicantId"
                    value={formData.applicantId}
                    onChange={(e) => handleInputChange('applicantId', e.target.value)}
                    placeholder="أدخل رقم الهوية"
                    data-testid="input-applicant-id"
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
              
              {/* Identity Image Upload */}
              <div>
                <Label htmlFor="identityImage">صورة الهوية</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="identityImage"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleInputChange('identityImage', file);
                    }}
                    className="hidden"
                    data-testid="input-identity-image"
                  />
                  <label htmlFor="identityImage" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">انقر لتحميل صورة الهوية</p>
                      {formData.identityImage && (
                        <p className="text-sm text-primary">تم اختيار: {formData.identityImage.name}</p>
                      )}
                    </div>
                  </label>
                  {formData.identityImage && (
                    <div className="mt-4 max-w-xs mx-auto">
                      <img 
                        src={URL.createObjectURL(formData.identityImage)} 
                        alt="Identity Preview" 
                        className="w-full h-32 object-cover rounded border" 
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Applicant Role */}
              <div>
                <Label htmlFor="applicantRole">صفة مقدم الطلب *</Label>
                <Select value={formData.applicantRole} onValueChange={(value) => handleInputChange('applicantRole', value)}>
                  <SelectTrigger data-testid="select-applicant-role">
                    <SelectValue placeholder="اختر صفة مقدم الطلب" />
                  </SelectTrigger>
                  <SelectContent>
                    {applicantRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Principal Details (when agent/delegate) */}
              {(formData.applicantRole === 'agent' || formData.applicantRole === 'delegate') && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-4">بيانات الموكل</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="principalName">اسم الموكل *</Label>
                      <Input
                        id="principalName"
                        value={formData.principalName}
                        onChange={(e) => handleInputChange('principalName', e.target.value)}
                        placeholder="أدخل اسم الموكل"
                        data-testid="input-principal-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="principalId">رقم هوية الموكل *</Label>
                      <Input
                        id="principalId"
                        value={formData.principalId}
                        onChange={(e) => handleInputChange('principalId', e.target.value)}
                        placeholder="رقم هوية الموكل"
                        data-testid="input-principal-id"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Step 2: معلومات الموقع */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">معلومات الموقع</h3>
                <p className="text-muted-foreground">حدد موقع الأرض أو العقار المطلوب مسحه</p>
              </div>
              
              {/* ✅ PHASE 1: Geographic Data Layout like /geographic-data */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Control Panel - Sidebar with selectors */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">اختيار الموقع الجغرافي</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="governorate" className="text-sm font-medium">المحافظة *</Label>
                        <Select value={formData.governorate} onValueChange={handleGovernorateChange}>
                          <SelectTrigger data-testid="select-governorate">
                            <SelectValue placeholder="اختر المحافظة" />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingGovernorates ? (
                              <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                            ) : governoratesError ? (
                              <SelectItem value="error" disabled>خطأ في تحميل المحافظات</SelectItem>
                            ) : (
                              governorates.map((gov) => (
                                <SelectItem key={gov.id} value={gov.id} data-testid={`option-governorate-${gov.code}`}>
                                  {gov.nameAr}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {formData.governorate && (
                        <div>
                          <Label htmlFor="district" className="text-sm font-medium">المديرية *</Label>
                          <Select value={formData.district} onValueChange={handleDistrictChange}>
                            <SelectTrigger data-testid="select-district">
                              <SelectValue placeholder="اختر المديرية" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingDistricts ? (
                                <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                              ) : districtsError ? (
                                <SelectItem value="error" disabled>خطأ في تحميل المديريات</SelectItem>
                              ) : districts.length === 0 ? (
                                <SelectItem value="no-districts" disabled>لا توجد مديريات متاحة</SelectItem>
                              ) : (
                                districts.map((district) => (
                                  <SelectItem key={district.id} value={district.id} data-testid={`option-district-${district.id}`}>
                                    {district.nameAr}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {formData.district && (
                        <div>
                          <Label htmlFor="subDistrict" className="text-sm font-medium">العزلة</Label>
                          <Select value={formData.subDistrict} onValueChange={handleSubDistrictChange}>
                            <SelectTrigger data-testid="select-sub-district">
                              <SelectValue placeholder="اختر العزلة" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingSubDistricts ? (
                                <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                              ) : subDistrictsError ? (
                                <SelectItem value="error" disabled>خطأ في تحميل العزل</SelectItem>
                              ) : subDistricts.length === 0 ? (
                                <SelectItem value="no-sub-districts" disabled>لا توجد عزل متاحة</SelectItem>
                              ) : (
                                subDistricts.map((subDistrict) => (
                                  <SelectItem key={subDistrict.id} value={subDistrict.id} data-testid={`option-sub-district-${subDistrict.id}`}>
                                    {subDistrict.nameAr}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {formData.subDistrict && (
                        <div>
                          <Label htmlFor="sector" className="text-sm font-medium">القطاع</Label>
                          <Select value={formData.sector} onValueChange={handleSectorChange}>
                            <SelectTrigger data-testid="select-sector">
                              <SelectValue placeholder="اختر القطاع" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingSectors ? (
                                <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                              ) : sectorsError ? (
                                <SelectItem value="error" disabled>خطأ في تحميل القطاعات</SelectItem>
                              ) : sectors.length === 0 ? (
                                <SelectItem value="no-sectors" disabled>لا توجد قطاعات متاحة</SelectItem>
                              ) : (
                                sectors.map((sector) => (
                                  <SelectItem key={sector.id} value={sector.id} data-testid={`option-sector-${sector.id}`}>
                                    {sector.nameAr}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {formData.sector && (
                        <div>
                          <Label htmlFor="neighborhoodUnit" className="text-sm font-medium">وحدة الجوار</Label>
                          <Select value={formData.neighborhoodUnit} onValueChange={(value) => handleInputChange('neighborhoodUnit', value)}>
                            <SelectTrigger data-testid="select-neighborhood-unit">
                              <SelectValue placeholder="اختر وحدة الجوار" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingNeighborhoodUnits ? (
                                <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                              ) : neighborhoodUnitsError ? (
                                <SelectItem value="error" disabled>خطأ في تحميل وحدات الجوار</SelectItem>
                              ) : neighborhoodUnits.length === 0 ? (
                                <SelectItem value="no-neighborhood-units" disabled>لا توجد وحدات جوار متاحة</SelectItem>
                              ) : (
                                neighborhoodUnits.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id} data-testid={`option-neighborhood-unit-${unit.id}`}>
                                    {unit.nameAr}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">بيانات إضافية</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="area" className="text-sm font-medium">المنطقة/القرية</Label>
                        <Input
                          id="area"
                          value={formData.area}
                          onChange={(e) => handleInputChange('area', e.target.value)}
                          placeholder="أدخل اسم المنطقة"
                          data-testid="input-area"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="landNumber" className="text-sm font-medium">رقم القطعة *</Label>
                        <Input
                          id="landNumber"
                          value={formData.landNumber}
                          onChange={(e) => handleInputChange('landNumber', e.target.value)}
                          placeholder="رقم قطعة الأرض"
                          data-testid="input-land-number"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="plotNumber" className="text-sm font-medium">رقم المخطط</Label>
                        <Input
                          id="plotNumber"
                          value={formData.plotNumber}
                          onChange={(e) => handleInputChange('plotNumber', e.target.value)}
                          placeholder="رقم المخطط إن وجد"
                          data-testid="input-plot-number"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="coordinates" className="text-sm font-medium">الإحداثيات</Label>
                        <div className="flex gap-2">
                          <Input
                            id="coordinates"
                            value={formData.coordinates}
                            onChange={(e) => handleInputChange('coordinates', e.target.value)}
                            placeholder="إحداثيات GPS إن وجدت"
                            data-testid="input-coordinates"
                            className="flex-1"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={handleSetCoordinatesFromMap}
                            data-testid="button-set-coordinates"
                            className="px-3"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          انقر على الزر لتحديد الإحداثيات من الخريطة
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Map Area - 3 columns */}
                <div className="lg:col-span-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapIcon className="h-5 w-5" />
                        الخريطة التفاعلية
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="h-[600px]">
                        <InteractiveDrawingMap
                          center={[15.3694, 44.1910]} // إحداثيات صنعاء، اليمن
                          zoom={7}
                          height="600px"
                          isEnabled={false} // تعطيل أدوات الرسم في هذه الخطوة
                          selectedGovernorateId={formData.governorate}
                          selectedDistrictId={formData.district}
                          selectedSubDistrictId={formData.subDistrict}
                          selectedSectorId={formData.sector}
                          selectedNeighborhoodUnitId={formData.neighborhoodUnit}
                          onLocationSelect={isSelectingCoordinates ? handleLocationSelect : undefined}
                          onBoundaryClick={(type, id, name) => {
                            if (type === 'governorate') {
                              handleGovernorateChange(id);
                              toast({
                                title: "تم اختيار المحافظة",
                                description: `تم اختيار محافظة ${name}`,
                                variant: "default",
                              });
                            } else if (type === 'district') {
                              handleDistrictChange(id);
                              toast({
                                title: "تم اختيار المديرية", 
                                description: `تم اختيار مديرية ${name}`,
                                variant: "default",
                              });
                            }
                          }}
                        />
                      </div>
                      <div className="p-4 bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          {isSelectingCoordinates 
                            ? "انقر على الخريطة لتحديد الإحداثيات الدقيقة للموقع" 
                            : "اختر المحافظة والمديرية من القوائم الجانبية أو انقر على الحدود الجغرافية في الخريطة"}
                        </p>
                        {isSelectingCoordinates && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setIsSelectingCoordinates(false);
                              toast({
                                title: "تم إلغاء تحديد الإحداثيات",
                                description: "يمكنك تفعيل وضع التحديد مرة أخرى عند الحاجة",
                                variant: "default",
                              });
                            }}
                            className="mt-2"
                          >
                            <X className="h-4 w-4 mr-2" />
                            إلغاء تحديد الإحداثيات
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* ✅ PHASE 1: GeoTIFF Viewer Section - Now integrated in sidebar */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    عرض ملف GeoTIFF
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {formData.hasGeoTiff ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">يتوفر ملف GeoTIFF لهذا الموقع</span>
                      </div>
                      {formData.geoTiffViewer ? (
                        <div className="border rounded bg-white p-4 h-48 flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">عارض ملف GeoTIFF</p>
                            <p className="text-xs">سيتم إضافة العارض في التحديث القادم</p>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => handleInputChange('geoTiffViewer', true)}
                          data-testid="button-view-geotiff"
                          className="w-full"
                        >
                          عرض الملف
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">لا يتوفر ملف GeoTIFF لهذا الموقع حالياً</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* ✅ PHASE 1 STEP 3: Enhanced Decision Type with Modals */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">نوع القرار المساحي</h3>
                <p className="text-muted-foreground">اختر نوع القرار المساحي المطلوب وأدخل التفاصيل المطلوبة</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {surveyTypes.map((type) => (
                  <Card 
                    key={type.value} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      formData.surveyType === type.value ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      handleInputChange('surveyType', type.value);
                      setSelectedSurveyTypeDetails(type);
                      setShowSurveyTypeModal(true);
                    }}
                    data-testid={`card-survey-type-${type.value}`}
                  >
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-semibold text-sm">{type.label}</h4>
                        {formData.surveyType === type.value && (
                          <Badge variant="default" className="mt-2 text-xs">
                            محدد
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {formData.surveyType && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">تفاصيل القرار المساحي</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                    {/* Display type-specific data if available */}
                    {formData.engineerName && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <h5 className="font-semibold mb-2">بيانات المهندس</h5>
                        <p className="text-sm">الاسم: {formData.engineerName}</p>
                        <p className="text-sm">رقم الرخصة: {formData.engineerLicense}</p>
                      </div>
                    )}

                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setSelectedSurveyTypeDetails(surveyTypes.find(t => t.value === formData.surveyType));
                        setShowSurveyTypeModal(true);
                      }}
                      className="w-full"
                    >
                      تعديل تفاصيل القرار
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {/* ✅ PHASE 1 STEP 4: Ownership Data */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">بيانات الملكية</h3>
                <p className="text-muted-foreground">أدخل بيانات الملكية وارفق الوثائق المطلوبة</p>
              </div>
              
              <div className="space-y-6">
                {/* Location Name (Optional) */}
                <div>
                  <Label htmlFor="locationName">اسم الموضع (اختياري)</Label>
                  <Input
                    id="locationName"
                    value={formData.locationName}
                    onChange={(e) => handleInputChange('locationName', e.target.value)}
                    placeholder="مثل: أرض الحيدان، مزرعة الزهراوي"
                    data-testid="input-location-name"
                  />
                </div>
                
                {/* Document Type */}
                <div>
                  <Label htmlFor="documentType">نوع الوثيقة *</Label>
                  <Select value={formData.documentType} onValueChange={(value) => handleInputChange('documentType', value)}>
                    <SelectTrigger data-testid="select-document-type">
                      <SelectValue placeholder="اختر نوع وثيقة الملكية" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((docType) => (
                        <SelectItem key={docType.value} value={docType.value}>{docType.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Ownership Classification */}
                <div>
                  <Label htmlFor="ownershipClassification">تصنيف *</Label>
                  <Select value={formData.ownershipClassification} onValueChange={(value) => handleInputChange('ownershipClassification', value)}>
                    <SelectTrigger data-testid="select-ownership-classification">
                      <SelectValue placeholder="اختر تصنيف الملكية" />
                    </SelectTrigger>
                    <SelectContent>
                      {ownershipClassifications.map((classification) => (
                        <SelectItem key={classification.value} value={classification.value}>{classification.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Enhanced Ownership Document Upload (Required) */}
                <div>
                  <Label htmlFor="ownershipDocument">وثيقة الملكية (إلزامي) *</Label>
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    fileUploadErrors.ownershipDocument 
                      ? 'border-red-300 bg-red-50' 
                      : formData.ownershipDocument 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}>
                    <input
                      type="file"
                      id="ownershipDocument"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleFileUpload(file, 'ownershipDocument', {
                          maxSizeMB: 10,
                          allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
                        });
                      }}
                      className="hidden"
                      data-testid="input-ownership-document"
                    />
                    <label htmlFor="ownershipDocument" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        {formData.ownershipDocument ? (
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        ) : (
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        )}
                        <p className="text-sm font-medium">
                          {formData.ownershipDocument ? 'تم رفع الوثيقة بنجاح' : 'انقر لتحميل وثيقة الملكية'}
                        </p>
                        <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG (حتى 10MB)</p>
                        {formData.ownershipDocument && (
                          <div className="bg-white p-3 rounded-lg border mt-2 max-w-xs">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="text-sm truncate">{formData.ownershipDocument.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleFileUpload(null, 'ownershipDocument');
                                }}
                                className="h-6 w-6 p-0 hover:bg-red-100"
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(formData.ownershipDocument.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                  {fileUploadErrors.ownershipDocument && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {fileUploadErrors.ownershipDocument}
                    </p>
                  )}
                </div>
                
                {/* Enhanced Commercial Registry (Required for Waqf) */}
                {formData.ownershipClassification === 'waqf' && (
                  <div>
                    <Label htmlFor="commercialRegistry">سجل تجاري (إلزامي للوقف) *</Label>
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      fileUploadErrors.commercialRegistry 
                        ? 'border-red-300 bg-red-50' 
                        : formData.commercialRegistry 
                          ? 'border-orange-300 bg-orange-50' 
                          : 'border-orange-200 bg-orange-50 hover:border-orange-400'
                    }`}>
                      <input
                        type="file"
                        id="commercialRegistry"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleFileUpload(file, 'commercialRegistry', {
                            maxSizeMB: 10,
                            allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
                          });
                        }}
                        className="hidden"
                        data-testid="input-commercial-registry"
                      />
                      <label htmlFor="commercialRegistry" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-2">
                          {formData.commercialRegistry ? (
                            <CheckCircle className="h-6 w-6 text-orange-600" />
                          ) : (
                            <Building2 className="h-6 w-6 text-orange-600" />
                          )}
                          <p className="text-sm font-medium text-orange-800">
                            {formData.commercialRegistry ? 'تم رفع السجل التجاري' : 'تحميل السجل التجاري'}
                          </p>
                          {formData.commercialRegistry && (
                            <div className="bg-white p-2 rounded border mt-1">
                              <div className="flex items-center gap-2 text-xs">
                                <FileText className="h-3 w-3 text-orange-600" />
                                <span className="truncate max-w-[150px]">{formData.commercialRegistry.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleFileUpload(null, 'commercialRegistry');
                                  }}
                                  className="h-4 w-4 p-0"
                                >
                                  <X className="h-2 w-2 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                    {fileUploadErrors.commercialRegistry && (
                      <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {fileUploadErrors.commercialRegistry}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Enhanced Other Attachments (Optional) */}
                <div>
                  <Label htmlFor="otherAttachments">مرفقات أخرى (اختياري)</Label>
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    fileUploadErrors.otherAttachments 
                      ? 'border-red-300 bg-red-50' 
                      : formData.otherAttachments.length > 0 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}>
                    <input
                      type="file"
                      id="otherAttachments"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleFileUpload(files, 'otherAttachments', {
                          maxSizeMB: 15,
                          allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.zip'],
                          multiple: true
                        });
                      }}
                      className="hidden"
                      data-testid="input-other-attachments"
                    />
                    <label htmlFor="otherAttachments" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        {formData.otherAttachments.length > 0 ? (
                          <CheckCircle className="h-6 w-6 text-blue-600" />
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        )}
                        <p className="text-sm font-medium">
                          {formData.otherAttachments.length > 0 
                            ? `تم رفع ${formData.otherAttachments.length} ملف` 
                            : 'انقر لتحميل ملفات إضافية'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, DOC, JPG, PNG, ZIP (حتى 15MB لكل ملف)
                        </p>
                        {formData.otherAttachments.length > 0 && (
                          <div className="bg-white p-3 rounded-lg border mt-2 w-full max-w-sm">
                            <div className="space-y-2">
                              {formData.otherAttachments.map((file: File, index: number) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                  <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                  <span className="truncate flex-1">{file.name}</span>
                                  <span className="text-muted-foreground">
                                    {(file.size / (1024 * 1024)).toFixed(1)}MB
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const newFiles = formData.otherAttachments.filter((_, i) => i !== index);
                                      handleInputChange('otherAttachments', newFiles);
                                    }}
                                    className="h-4 w-4 p-0"
                                  >
                                    <X className="h-2 w-2 text-red-500" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleInputChange('otherAttachments', []);
                                }}
                                className="w-full text-xs h-6"
                              >
                                حذف جميع الملفات
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                  {fileUploadErrors.otherAttachments && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {fileUploadErrors.otherAttachments}
                    </p>
                  )}
                </div>
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
                // لا نعرض الحدود في الخطوة الرابعة - فقط أدوات الرسم
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
          
          {/* ✅ PHASE 1 STEP 5: Application Confirmation */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">تأكيد الطلب</h3>
                <p className="text-muted-foreground">مراجعة شاملة ونهائية للبيانات المدخلة</p>
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

      {/* ✅ PHASE 1: Survey Type Details Modal */}
      <Dialog open={showSurveyTypeModal} onOpenChange={setShowSurveyTypeModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              تفاصيل {selectedSurveyTypeDetails?.label || 'القرار المساحي'}
            </DialogTitle>
            <DialogDescription>
              أدخل التفاصيل الإضافية المطلوبة لهذا النوع من القرار
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* للرخص الهندسية */}
            {(formData.surveyType === 'new_building_license' || formData.surveyType === 'old_building_license') && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">بيانات المهندس المختص</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="engineerName">اسم المهندس *</Label>
                    <Input
                      id="engineerName"
                      value={formData.engineerName || ''}
                      onChange={(e) => handleInputChange('engineerName', e.target.value)}
                      placeholder="أدخل اسم المهندس"
                      data-testid="input-engineer-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="engineerLicense">رقم رخصة المهندس *</Label>
                    <Input
                      id="engineerLicense"
                      value={formData.engineerLicense || ''}
                      onChange={(e) => handleInputChange('engineerLicense', e.target.value)}
                      placeholder="أدخل رقم رخصة المهندس"
                      data-testid="input-engineer-license"
                    />
                  </div>
                  <div>
                    <Label htmlFor="engineerPhone">رقم الهاتف</Label>
                    <Input
                      id="engineerPhone"
                      value={formData.engineerPhone || ''}
                      onChange={(e) => handleInputChange('engineerPhone', e.target.value)}
                      placeholder="أدخل رقم هاتف المهندس"
                      data-testid="input-engineer-phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="buildingType">نوع البناء</Label>
                    <Select value={formData.buildingType || ''} onValueChange={(value) => handleInputChange('buildingType', value)}>
                      <SelectTrigger data-testid="select-building-type">
                        <SelectValue placeholder="اختر نوع البناء" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">سكني</SelectItem>
                        <SelectItem value="commercial">تجاري</SelectItem>
                        <SelectItem value="industrial">صناعي</SelectItem>
                        <SelectItem value="mixed">مختلط</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* للإسقاط القديم */}
            {formData.surveyType === 'old_drop_registration' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">بيانات الإسقاط القديم</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="oldDropYear">سنة الإسقاط *</Label>
                    <Input
                      id="oldDropYear"
                      value={formData.oldDropYear || ''}
                      onChange={(e) => handleInputChange('oldDropYear', e.target.value)}
                      placeholder="مثل: 1995"
                      data-testid="input-old-drop-year"
                    />
                  </div>
                  <div>
                    <Label htmlFor="oldDropNumber">رقم الإسقاط *</Label>
                    <Input
                      id="oldDropNumber"
                      value={formData.oldDropNumber || ''}
                      onChange={(e) => handleInputChange('oldDropNumber', e.target.value)}
                      placeholder="رقم الإسقاط القديم"
                      data-testid="input-old-drop-number"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="oldDropFile">ملف الإسقاط القديم (PDF أو صورة)</Label>
                  <Input
                    id="oldDropFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleInputChange('oldDropFile', file);
                    }}
                    data-testid="input-old-drop-file"
                  />
                  {formData.oldDropFile && (
                    <p className="text-sm text-green-600 mt-2">
                      ✅ تم اختيار: {formData.oldDropFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* لتسوية النزاع */}
            {formData.surveyType === 'dispute_settlement' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">تفاصيل النزاع</h4>
                <div>
                  <Label htmlFor="disputeParties">أطراف النزاع *</Label>
                  <Textarea
                    id="disputeParties"
                    value={formData.disputeParties || ''}
                    onChange={(e) => handleInputChange('disputeParties', e.target.value)}
                    placeholder="أدخل أسماء وتفاصيل أطراف النزاع"
                    rows={2}
                    data-testid="textarea-dispute-parties"
                  />
                </div>
                <div>
                  <Label htmlFor="disputeDescription">وصف النزاع *</Label>
                  <Textarea
                    id="disputeDescription"
                    value={formData.disputeDescription || ''}
                    onChange={(e) => handleInputChange('disputeDescription', e.target.value)}
                    placeholder="اشرح طبيعة النزاع والمشكلة المطلوب حلها"
                    rows={3}
                    data-testid="textarea-dispute-description"
                  />
                </div>
                <div>
                  <Label htmlFor="disputeDate">تاريخ بداية النزاع</Label>
                  <Input
                    id="disputeDate"
                    type="date"
                    value={formData.disputeDate || ''}
                    onChange={(e) => handleInputChange('disputeDate', e.target.value)}
                    data-testid="input-dispute-date"
                  />
                </div>
              </div>
            )}

            {/* للأنواع التي لا تحتاج تفاصيل إضافية */}
            {!['new_building_license', 'old_building_license', 'old_drop_registration', 'dispute_settlement'].includes(formData.surveyType) && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-lg font-semibold">تم اختيار نوع القرار</p>
                <p className="text-muted-foreground">
                  لا توجد تفاصيل إضافية مطلوبة لهذا النوع من القرار
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowSurveyTypeModal(false)}
            >
              إلغاء
            </Button>
            <Button 
              type="button" 
              onClick={() => setShowSurveyTypeModal(false)}
              className="bg-primary text-white"
            >
              حفظ التفاصيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}