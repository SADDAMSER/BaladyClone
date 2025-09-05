import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Building,
  Map,
  FileText,
  Users,
  Settings,
  Building2,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileDown,
  Save,
  Send,
  ArrowLeft,
  Info
} from "lucide-react";

// Application form schema
const applicationFormSchema = z.object({
  // Personal Information
  applicantName: z.string().min(2, "الاسم مطلوب ويجب أن يكون أكثر من حرفين"),
  applicantPhone: z.string().min(9, "رقم الهاتف مطلوب"),
  applicantEmail: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  applicantAddress: z.string().min(10, "العنوان مطلوب"),
  
  // Project Information (for building services)
  projectName: z.string().optional(),
  projectLocation: z.string().optional(), 
  projectDescription: z.string().optional(),
  projectArea: z.number().optional(),
  projectType: z.string().optional(),
  
  // Additional Notes
  additionalNotes: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationFormSchema>;

interface ServiceApplicationData {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  category: string;
  type: string;
  processingTimeEstimate?: number;
  fees?: string;
  requiredDocuments: Array<{
    id: string;
    name: string;
    description?: string;
    isRequired: boolean;
    fileTypes: string[];
    maxSizeMB: number;
  }>;
  formFields: Array<{
    id: string;
    type: string;
    name: string;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  icon: string;
  color: string;
}

// Mock service data with form configuration
const mockServiceApplicationData: Record<string, ServiceApplicationData> = {
  "1": {
    id: "1",
    name: "إصدار رخصة بناء",
    nameEn: "Building License Issuance",
    description: "خدمة إصدار تراخيص البناء للمشاريع السكنية والتجارية والصناعية",
    category: "building_permits",
    type: "building_license",
    processingTimeEstimate: 7,
    fees: "500.00",
    icon: "Building",
    color: "#3b82f6",
    requiredDocuments: [
      {
        id: "1",
        name: "صورة البطاقة الشخصية",
        description: "صورة واضحة من البطاقة الشخصية أو جواز السفر",
        isRequired: true,
        fileTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxSizeMB: 2
      },
      {
        id: "2", 
        name: "صك الملكية",
        description: "صك الملكية أو عقد الإيجار للأرض",
        isRequired: true,
        fileTypes: ["application/pdf", "image/jpeg", "image/png"],
        maxSizeMB: 5
      },
      {
        id: "3",
        name: "المخططات المعمارية",
        description: "المخططات المعمارية والإنشائية معتمدة من مهندس مختص",
        isRequired: true,
        fileTypes: ["application/pdf"],
        maxSizeMB: 10
      },
      {
        id: "4",
        name: "القرار المساحي",
        description: "القرار المساحي للأرض",
        isRequired: true,
        fileTypes: ["application/pdf", "image/jpeg", "image/png"],
        maxSizeMB: 3
      }
    ],
    formFields: [
      { id: "projectType", type: "select", name: "projectType", label: "نوع المشروع", required: true, options: [
        { value: "residential", label: "سكني" },
        { value: "commercial", label: "تجاري" },
        { value: "industrial", label: "صناعي" },
        { value: "mixed", label: "مختلط" }
      ]},
      { id: "projectArea", type: "number", name: "projectArea", label: "مساحة المشروع (متر مربع)", required: true },
      { id: "floors", type: "number", name: "floors", label: "عدد الطوابق", required: true }
    ]
  },
  "2": {
    id: "2",
    name: "إصدار قرار مساحي", 
    nameEn: "Surveying Decision",
    description: "خدمة إصدار القرارات المساحية وتحديد الحدود والإحداثيات",
    category: "surveying",
    type: "surveying_decision",
    processingTimeEstimate: 3,
    fees: "200.00",
    icon: "Map",
    color: "#10b981",
    requiredDocuments: [
      {
        id: "1",
        name: "صورة البطاقة الشخصية",
        description: "صورة واضحة من البطاقة الشخصية",
        isRequired: true,
        fileTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxSizeMB: 2
      },
      {
        id: "2",
        name: "صك الملكية",
        description: "صك الملكية أو وثيقة الملكية",
        isRequired: true,
        fileTypes: ["application/pdf", "image/jpeg", "image/png"],
        maxSizeMB: 5
      }
    ],
    formFields: [
      { id: "landArea", type: "number", name: "landArea", label: "مساحة الأرض التقريبية (متر مربع)", required: false },
      { id: "surveyPurpose", type: "select", name: "surveyPurpose", label: "الغرض من الرفع المساحي", required: true, options: [
        { value: "building", label: "للبناء" },
        { value: "selling", label: "للبيع" },
        { value: "inheritance", label: "للوراثة" },
        { value: "other", label: "أخرى" }
      ]}
    ]
  }
};

const iconComponents = {
  Building: Building,
  Map: Map,
  FileText: FileText,
  Users: Users,
  Settings: Settings,
  Building2: Building2
};

export default function ServiceApplication() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const serviceId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 3; // 1: Service Info, 2: Form & Documents, 3: Review & Submit

  // Fetch service data
  const { data: service, isLoading, error } = useQuery({
    queryKey: ["/api/services", serviceId, "application"],
    queryFn: () => {
      const serviceData = mockServiceApplicationData[serviceId];
      if (!serviceData) {
        throw new Error("Service not found");
      }
      return Promise.resolve(serviceData);
    },
    enabled: !!serviceId,
    retry: false
  });

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      applicantName: "",
      applicantPhone: "",
      applicantEmail: "",
      applicantAddress: "",
      projectName: "",
      projectLocation: "",
      projectDescription: "",
      additionalNotes: "",
    }
  });

  const submitApplication = useMutation({
    mutationFn: async (data: ApplicationFormData & { files: Record<string, File> }) => {
      setIsSubmitting(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { id: "APP-2024-001", status: "submitted" };
    },
    onSuccess: (result) => {
      toast({
        title: "تم تقديم الطلب بنجاح",
        description: `رقم الطلب: ${result.id}`,
        variant: "default",
      });
      setLocation(`/applications/${result.id}`);
    },
    onError: (error) => {
      toast({
        title: "خطأ في تقديم الطلب",
        description: "حدث خطأ أثناء تقديم الطلب. الرجاء المحاولة مرة أخرى.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleFileUpload = (documentId: string, file: File) => {
    setUploadedFiles(prev => ({
      ...prev,
      [documentId]: file
    }));
  };

  const handleSubmit = (data: ApplicationFormData) => {
    submitApplication.mutate({
      ...data,
      files: uploadedFiles
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">الخدمة غير متاحة</h3>
          <p className="text-muted-foreground mb-4">لم نتمكن من العثور على معلومات الخدمة</p>
          <Button onClick={() => setLocation('/services')}>
            العودة لدليل الخدمات
          </Button>
        </div>
      </div>
    );
  }

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconComponents[iconName as keyof typeof iconComponents] || FileText;
    return IconComponent;
  };

  const IconComponent = getIconComponent(service.icon);
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl" data-testid="service-application">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <Button variant="ghost" onClick={() => setLocation(`/services/${serviceId}`)}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة لتفاصيل الخدمة
          </Button>
        </div>
        
        <div className="flex items-center space-x-4 space-x-reverse mb-6">
          <div 
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${service.color}15`, color: service.color }}
          >
            <IconComponent className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">تقديم طلب: {service.name}</h1>
            <p className="text-muted-foreground">{service.nameEn}</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">الخطوة {currentStep} من {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% مكتمل</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center space-x-8 space-x-reverse mb-8">
          <div className={`flex items-center space-x-2 space-x-reverse ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {currentStep > 1 ? <CheckCircle className="h-4 w-4" /> : "1"}
            </div>
            <span className="text-sm font-medium">معلومات الخدمة</span>
          </div>
          <div className={`flex items-center space-x-2 space-x-reverse ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {currentStep > 2 ? <CheckCircle className="h-4 w-4" /> : "2"}
            </div>
            <span className="text-sm font-medium">النموذج والمرفقات</span>
          </div>
          <div className={`flex items-center space-x-2 space-x-reverse ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              "3"
            </div>
            <span className="text-sm font-medium">المراجعة والإرسال</span>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Step 1: Service Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 space-x-reverse">
                    <Info className="h-5 w-5" />
                    <span>معلومات الخدمة</span>
                  </CardTitle>
                  <CardDescription>
                    تأكد من قراءة جميع المعلومات المتعلقة بالخدمة قبل المتابعة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">وصف الخدمة</h3>
                    <p className="text-muted-foreground">{service.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>مدة الإنجاز:</strong> {service.processingTimeEstimate} أيام
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>الرسوم:</strong> {service.fees} ريال
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>المرفقات:</strong> {service.requiredDocuments.filter(d => d.isRequired).length} مطلوبة
                      </span>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>تنبيه هام:</strong> تأكد من إعداد جميع المستندات المطلوبة قبل تقديم الطلب. 
                      سيتم رفض الطلبات غير المكتملة وإرجاع الرسوم.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(2)} data-testid="button-continue-step-1">
                  متابعة
                  <ArrowLeft className="h-4 w-4 mr-2 rotate-180" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Application Form & Documents */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Application Form */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>معلومات مقدم الطلب</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="applicantName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-1 space-x-reverse">
                            <User className="h-4 w-4" />
                            <span>الاسم الكامل</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="أدخل الاسم الكامل" {...field} data-testid="input-applicant-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="applicantPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center space-x-1 space-x-reverse">
                              <Phone className="h-4 w-4" />
                              <span>رقم الهاتف</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="967xxxxxxxxx" {...field} data-testid="input-applicant-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="applicantEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center space-x-1 space-x-reverse">
                              <Mail className="h-4 w-4" />
                              <span>البريد الإلكتروني (اختياري)</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="example@email.com" {...field} data-testid="input-applicant-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="applicantAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-1 space-x-reverse">
                            <MapPin className="h-4 w-4" />
                            <span>العنوان</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea placeholder="أدخل العنوان الكامل..." {...field} data-testid="input-applicant-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Service-specific form fields */}
                {service.formFields.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>تفاصيل الطلب</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {service.formFields.map((field) => (
                        <div key={field.id}>
                          <Label htmlFor={field.id} className="flex items-center space-x-1 space-x-reverse mb-2">
                            <span>{field.label}</span>
                            {field.required && <span className="text-red-500">*</span>}
                          </Label>
                          {field.type === 'select' && field.options ? (
                            <select
                              id={field.id}
                              className="w-full h-10 px-3 rounded-md border border-input bg-background"
                              data-testid={`select-${field.id}`}
                            >
                              <option value="">اختر...</option>
                              {field.options.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'number' ? (
                            <Input
                              id={field.id}
                              type="number"
                              placeholder={field.placeholder}
                              data-testid={`input-${field.id}`}
                            />
                          ) : (
                            <Input
                              id={field.id}
                              placeholder={field.placeholder}
                              data-testid={`input-${field.id}`}
                            />
                          )}
                        </div>
                      ))}
                      
                      <FormField
                        control={form.control}
                        name="additionalNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ملاحظات إضافية</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="أي ملاحظات أو معلومات إضافية..." 
                                {...field} 
                                data-testid="input-additional-notes"
                              />
                            </FormControl>
                            <FormDescription>
                              يمكنك إضافة أي معلومات إضافية تساعد في معالجة طلبك
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Required Documents */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 space-x-reverse">
                      <FileDown className="h-5 w-5" />
                      <span>المستندات المطلوبة</span>
                    </CardTitle>
                    <CardDescription>
                      ارفع جميع المستندات المطلوبة. يجب أن تكون الملفات واضحة ومقروءة.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {service.requiredDocuments.map((document) => (
                      <div key={document.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium flex items-center space-x-1 space-x-reverse">
                              <span>{document.name}</span>
                              {document.isRequired && <Badge variant="secondary" className="text-xs">مطلوب</Badge>}
                            </h4>
                            <p className="text-sm text-muted-foreground">{document.description}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <input
                            type="file"
                            id={`file-${document.id}`}
                            accept={document.fileTypes.join(',')}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > document.maxSizeMB * 1024 * 1024) {
                                  toast({
                                    title: "حجم الملف كبير جداً",
                                    description: `الحد الأقصى لحجم الملف هو ${document.maxSizeMB} ميجابايت`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                handleFileUpload(document.id, file);
                              }
                            }}
                            className="hidden"
                            data-testid={`file-input-${document.id}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const input = window.document.getElementById(`file-${document.id}`) as HTMLInputElement;
                              input?.click();
                            }}
                            className="w-full"
                            data-testid={`button-upload-${document.id}`}
                          >
                            <Upload className="h-4 w-4 ml-2" />
                            {uploadedFiles[document.id] ? 'تغيير الملف' : 'رفع الملف'}
                          </Button>
                          
                          {uploadedFiles[document.id] && (
                            <div className="mt-2 flex items-center space-x-2 space-x-reverse text-sm text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span>{uploadedFiles[document.id].name}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                          أنواع الملفات المدعومة: {document.fileTypes.join(', ')} | الحد الأقصى: {document.maxSizeMB} ميجابايت
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>مراجعة الطلب</CardTitle>
                  <CardDescription>
                    راجع جميع المعلومات قبل إرسال الطلب. لن تتمكن من تعديلها بعد الإرسال.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Application Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">معلومات مقدم الطلب</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>الاسم:</strong> {form.getValues('applicantName')}</div>
                        <div><strong>الهاتف:</strong> {form.getValues('applicantPhone')}</div>
                        <div><strong>البريد الإلكتروني:</strong> {form.getValues('applicantEmail') || 'غير محدد'}</div>
                        <div><strong>العنوان:</strong> {form.getValues('applicantAddress')}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">معلومات الخدمة</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>اسم الخدمة:</strong> {service.name}</div>
                        <div><strong>الرسوم:</strong> {service.fees} ريال</div>
                        <div><strong>مدة الإنجاز:</strong> {service.processingTimeEstimate} أيام</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Uploaded Documents */}
                  <div>
                    <h4 className="font-semibold mb-3">المستندات المرفوعة</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {service.requiredDocuments.map((document) => (
                        <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{document.name}</p>
                            {uploadedFiles[document.id] && (
                              <p className="text-xs text-muted-foreground">{uploadedFiles[document.id].name}</p>
                            )}
                          </div>
                          {uploadedFiles[document.id] ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      بتقديم هذا الطلب، أؤكد أن جميع المعلومات المقدمة صحيحة ودقيقة، وأتحمل المسؤولية الكاملة عن أي معلومات خاطئة.
                      كما أوافق على شروط وأحكام الخدمة.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              {currentStep > 1 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCurrentStep(currentStep - 1)}
                  data-testid="button-previous-step"
                >
                  <ArrowLeft className="h-4 w-4 ml-2" />
                  السابق
                </Button>
              )}
            </div>
            
            <div className="space-x-2 space-x-reverse">
              {currentStep < totalSteps ? (
                <>
                  <Button 
                    type="button" 
                    variant="outline"
                    data-testid="button-save-draft"
                  >
                    <Save className="h-4 w-4 ml-2" />
                    حفظ كمسودة
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setCurrentStep(currentStep + 1)}
                    data-testid="button-next-step"
                  >
                    التالي
                    <ArrowLeft className="h-4 w-4 mr-2 rotate-180" />
                  </Button>
                </>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  data-testid="button-submit-application"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 ml-2" />
                      تقديم الطلب
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}