import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Building, 
  Map, 
  FileText, 
  Users, 
  Settings,
  Building2,
  Clock,
  DollarSign,
  CheckCircle,
  FileDown,
  AlertCircle,
  ArrowRight,
  User,
  Briefcase
} from "lucide-react";

interface ServiceDetailsData {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  detailedDescription: string;
  category: string;
  type: string;
  processingTimeEstimate?: number;
  fees?: string;
  targetAudience: string[];
  icon: string;
  color: string;
  requiredDocuments: string[];
  steps: Array<{
    id: number;
    title: string;
    description: string;
    estimatedTime: string;
  }>;
  requirements: string[];
  notes: string[];
  isActive: boolean;
}

// Mock detailed service data
const mockServiceDetails: Record<string, ServiceDetailsData> = {
  "1": {
    id: "1",
    name: "إصدار رخصة بناء",
    nameEn: "Building License Issuance",
    description: "خدمة إصدار تراخيص البناء للمشاريع السكنية والتجارية والصناعية",
    detailedDescription: "تتيح هذه الخدمة للمواطنين والمستثمرين الحصول على تراخيص البناء اللازمة للمشاريع الإنشائية. يتم مراجعة الطلبات من قبل فريق متخصص من المهندسين والفنيين لضمان الامتثال للاشتراطات الفنية والقانونية.",
    category: "building_permits",
    type: "building_license", 
    processingTimeEstimate: 7,
    fees: "500.00",
    targetAudience: ["individuals", "companies"],
    icon: "Building",
    color: "#3b82f6",
    requiredDocuments: [
      "صورة من البطاقة الشخصية أو جواز السفر",
      "صك الملكية أو عقد الإيجار",
      "المخططات المعمارية والإنشائية معتمدة من مهندس مختص",
      "القرار المساحي للأرض", 
      "تقرير التربة (للمباني أكثر من طابقين)",
      "موافقة الدفاع المدني (للمباني التجارية)"
    ],
    steps: [
      {
        id: 1,
        title: "تقديم الطلب",
        description: "تعبئة النموذج الإلكتروني ورفع المستندات المطلوبة",
        estimatedTime: "30 دقيقة"
      },
      {
        id: 2,
        title: "المراجعة الأولية",
        description: "مراجعة المستندات والتأكد من اكتمالها",
        estimatedTime: "يوم واحد"
      },
      {
        id: 3,
        title: "الفحص الفني",
        description: "مراجعة المخططات من قبل المهندسين المختصين",
        estimatedTime: "3-4 أيام"
      },
      {
        id: 4,
        title: "الكشف الميداني",
        description: "زيارة الموقع والتأكد من مطابقته للمخططات",
        estimatedTime: "يوم واحد"
      },
      {
        id: 5,
        title: "الاعتماد والإصدار",
        description: "اعتماد الترخيص وإرسال إشعار للمتقدم",
        estimatedTime: "يوم واحد"
      }
    ],
    requirements: [
      "أن تكون الأرض مملوكة للمتقدم أو لديه تفويض رسمي",
      "مطابقة المشروع للمخطط التنظيمي للمنطقة",
      "عدم تعارض المشروع مع المصلحة العامة",
      "توفر جميع المرافق الأساسية (ماء، كهرباء، صرف صحي)"
    ],
    notes: [
      "يجب دفع الرسوم قبل البدء في المراجعة",
      "صالحية الترخيص سنة واحدة من تاريخ الإصدار",
      "يمكن تجديد الترخيص لمدة سنة إضافية",
      "أي تعديل على المخططات يتطلب موافقة مسبقة"
    ],
    isActive: true
  },
  "2": {
    id: "2",
    name: "إصدار قرار مساحي",
    nameEn: "Surveying Decision",
    description: "خدمة إصدار القرارات المساحية وتحديد الحدود والإحداثيات",
    detailedDescription: "خدمة حكومية تهدف إلى تحديد حدود الأراضي بدقة وإصدار قرار مساحي رسمي يحدد المساحة والإحداثيات والحدود المجاورة. هذه الخدمة ضرورية لأي عملية بناء أو بيع أو شراء للأراضي.",
    category: "surveying",
    type: "surveying_decision",
    processingTimeEstimate: 3,
    fees: "200.00",
    targetAudience: ["individuals", "companies", "organizations"],
    icon: "Map",
    color: "#10b981",
    requiredDocuments: [
      "صورة من البطاقة الشخصية",
      "صك الملكية أو وثيقة الملكية",
      "خريطة تقريبية للموقع (اختيارية)",
      "تفويض رسمي (في حالة التمثيل)"
    ],
    steps: [
      {
        id: 1,
        title: "تقديم الطلب",
        description: "تعبئة بيانات الطلب وتحديد الموقع الجغرافي التقريبي",
        estimatedTime: "15 دقيقة"
      },
      {
        id: 2,
        title: "تكليف المساح",
        description: "تعيين مساح مختص للنزول الميداني",
        estimatedTime: "يوم واحد"
      },
      {
        id: 3,
        title: "الرفع المساحي",
        description: "النزول الميداني وقياس الأرض بأجهزة دقيقة",
        estimatedTime: "يوم واحد"
      },
      {
        id: 4,
        title: "إعداد القرار",
        description: "معالجة البيانات وإعداد القرار المساحي النهائي",
        estimatedTime: "يوم واحد"
      }
    ],
    requirements: [
      "وجود وثيقة ملكية صحيحة",
      "إمكانية الوصول للموقع",
      "تحديد الحدود بوضوح في الموقع"
    ],
    notes: [
      "يجب حضور المالك أو المفوض أثناء الرفع المساحي",
      "القرار المساحي صالح لمدة سنة من تاريخ الإصدار",
      "يمكن طلب نسخة إضافية من القرار مقابل رسوم إضافية"
    ],
    isActive: true
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

const targetAudienceLabels = {
  individuals: { label: "أفراد", icon: User, color: "#3b82f6" },
  companies: { label: "شركات", icon: Briefcase, color: "#10b981" },
  organizations: { label: "مؤسسات", icon: Building2, color: "#f59e0b" }
};

export default function ServiceDetails() {
  const params = useParams();
  const serviceId = params.id as string;

  // This will be replaced with real API call
  const { data: service, isLoading, error } = useQuery({
    queryKey: ["/api/services", serviceId],
    queryFn: () => Promise.resolve(mockServiceDetails[serviceId]),
    enabled: !!serviceId
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">الخدمة غير موجودة</h3>
          <p className="text-muted-foreground mb-4">لم نتمكن من العثور على الخدمة المطلوبة</p>
          <Link href="/services">
            <Button>العودة لدليل الخدمات</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconComponents[iconName as keyof typeof iconComponents] || FileText;
    return IconComponent;
  };

  const IconComponent = getIconComponent(service.icon);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl" data-testid="service-details">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground mb-8">
        <Link href="/services" className="hover:text-foreground">دليل الخدمات</Link>
        <ArrowRight className="h-4 w-4" />
        <span className="text-foreground">{service.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Service Header */}
          <Card>
            <CardHeader className="pb-6">
              <div className="flex items-start space-x-4 space-x-reverse">
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${service.color}15`, color: service.color }}
                >
                  <IconComponent className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold mb-2">{service.name}</CardTitle>
                  {service.nameEn && (
                    <p className="text-lg text-muted-foreground font-medium mb-4">{service.nameEn}</p>
                  )}
                  <CardDescription className="text-base leading-relaxed">
                    {service.detailedDescription}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Required Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <FileDown className="h-5 w-5" />
                <span>المستندات المطلوبة</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {service.requiredDocuments.map((document, index) => (
                  <div key={index} className="flex items-start space-x-3 space-x-reverse">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{document}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Process Steps */}
          <Card>
            <CardHeader>
              <CardTitle>خطوات إنجاز الخدمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {service.steps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-4 space-x-reverse">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {step.id}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{step.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                      <div className="flex items-center space-x-1 space-x-reverse text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>المدة المتوقعة: {step.estimatedTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Requirements and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>الشروط والمتطلبات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {service.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-start space-x-2 space-x-reverse">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{requirement}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ملاحظات مهمة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {service.notes.map((note, index) => (
                    <div key={index} className="flex items-start space-x-2 space-x-reverse">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{note}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Service Info */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات الخدمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">مدة الإنجاز:</span>
                <div className="flex items-center space-x-1 space-x-reverse">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{service.processingTimeEstimate} أيام</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">الرسوم:</span>
                <div className="flex items-center space-x-1 space-x-reverse">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-bold">{service.fees} ريال</span>
                </div>
              </div>

              <Separator />

              <div>
                <span className="text-sm font-medium mb-2 block">الفئات المستهدفة:</span>
                <div className="flex flex-wrap gap-2">
                  {service.targetAudience.map((audience) => {
                    const audienceData = targetAudienceLabels[audience as keyof typeof targetAudienceLabels];
                    const AudienceIcon = audienceData.icon;
                    return (
                      <Badge 
                        key={audience} 
                        variant="secondary"
                        style={{ backgroundColor: `${audienceData.color}15`, color: audienceData.color }}
                      >
                        <AudienceIcon className="h-3 w-3 ml-1" />
                        {audienceData.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Link href={`/services/${service.id}/apply`} className="block">
                  <Button className="w-full" size="lg" data-testid="button-start-application">
                    تقديم طلب جديد
                  </Button>
                </Link>
                <Button variant="outline" className="w-full" data-testid="button-track-application">
                  تتبع طلب موجود
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>تحتاج مساعدة؟</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                يمكنك التواصل معنا للحصول على الدعم والمساعدة
              </p>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">الهاتف:</span>
                  <span className="mr-2">967-1-234567</span>
                </div>
                <div>
                  <span className="font-medium">البريد الإلكتروني:</span>
                  <span className="mr-2">support@yemen-construction.gov.ye</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}