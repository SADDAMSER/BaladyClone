import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  MapPin, 
  FileText, 
  Users, 
  Clock, 
  Shield,
  Phone,
  Mail,
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function PublicHomePage() {
  const services = [
    {
      id: "surveying-decision",
      title: "قرار المساحة",
      description: "تقديم طلب للحصول على قرار مساحي للأراضي والعقارات",
      icon: <MapPin className="h-6 w-6" />,
      path: "/services/surveying-decision",
      category: "خدمات المساحة",
      estimatedTime: "7-14 يوم",
      requirements: ["صورة هوية", "صك الملكية", "خريطة موقعية"],
      status: "available"
    },
    {
      id: "building-license",
      title: "رخصة البناء",
      description: "تقديم طلب للحصول على رخصة بناء للمشاريع السكنية والتجارية",
      icon: <Building2 className="h-6 w-6" />,
      path: "/services/building-license",
      category: "التراخيص",
      estimatedTime: "14-30 يوم",
      requirements: ["قرار المساحة", "مخططات هندسية", "موافقة الدفاع المدني"],
      status: "coming-soon"
    },
    {
      id: "renovation-permit",
      title: "تصريح الترميم",
      description: "تقديم طلب للحصول على تصريح ترميم أو تعديل المباني الموجودة",
      icon: <FileText className="h-6 w-6" />,
      path: "/services/renovation-permit",
      category: "التراخيص",
      estimatedTime: "7-10 أيام",
      requirements: ["رخصة البناء الأصلية", "مخططات التعديل", "موافقة المالك"],
      status: "coming-soon"
    },
    {
      id: "commercial-license",
      title: "الرخصة التجارية",
      description: "تقديم طلب للحصول على رخصة تجارية للأنشطة التجارية",
      icon: <Users className="h-6 w-6" />,
      path: "/services/commercial-license",
      category: "الشؤون التجارية",
      estimatedTime: "10-21 يوم",
      requirements: ["عقد الإيجار", "موافقة البلدية", "شهادة صحية"],
      status: "coming-soon"
    }
  ];

  const stats = [
    { label: "الطلبات المعالجة", value: "5,247", icon: <CheckCircle className="h-5 w-5" /> },
    { label: "الخدمات المتاحة", value: "12", icon: <FileText className="h-5 w-5" /> },
    { label: "المستخدمين النشطين", value: "1,832", icon: <Users className="h-5 w-5" /> },
    { label: "متوسط وقت الإنجاز", value: "9 أيام", icon: <Clock className="h-5 w-5" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <span className="mr-3 text-xl font-bold text-gray-900 dark:text-white">
                    منصة بناء اليمن
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  تسجيل الدخول للموظفين
                </Button>
              </Link>
              <Link href="/citizen/track">
                <Button size="sm">
                  تتبع طلب
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              منصة الخدمات الحكومية
              <span className="block text-blue-600">للجمهورية اليمنية</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              نقدم لك جميع الخدمات الحكومية في مكان واحد. سهولة في التقديم، شفافية في المتابعة، وسرعة في الإنجاز.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#services">
                <Button size="lg" className="min-w-[200px]">
                  تصفح الخدمات
                </Button>
              </Link>
              <Link href="/citizen/help">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  المساعدة والدعم
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-2 bg-blue-100 rounded-full dark:bg-blue-900">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              الخدمات المتاحة
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              نوفر لك مجموعة شاملة من الخدمات الحكومية الرقمية لتوفير الوقت والجهد
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service) => (
              <Card key={service.id} className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                        {service.icon}
                      </div>
                      <div>
                        <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                        <Badge variant={service.status === "available" ? "default" : "secondary"}>
                          {service.status === "available" ? "متاح الآن" : "قريباً"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-base mt-2">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">الفئة:</span>
                      <span className="font-medium">{service.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">وقت الإنجاز المتوقع:</span>
                      <span className="font-medium">{service.estimatedTime}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">المتطلبات:</p>
                      <ul className="text-sm space-y-1">
                        {service.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-center space-x-2 space-x-reverse">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-4">
                      {service.status === "available" ? (
                        <Link href={service.path}>
                          <Button className="w-full" data-testid={`button-apply-${service.id}`}>
                            تقديم طلب
                            <ExternalLink className="h-4 w-4 mr-2" />
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled className="w-full">
                          <AlertCircle className="h-4 w-4 ml-2" />
                          متاح قريباً
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              تواصل معنا
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              نحن هنا لمساعدتك في أي استفسار أو مشكلة قد تواجهها
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-blue-100 rounded-full inline-block mb-4 dark:bg-blue-900">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">الهاتف</h3>
                <p className="text-gray-600 dark:text-gray-300">+967 1 123 456</p>
                <p className="text-gray-600 dark:text-gray-300">الأحد - الخميس: 8:00 - 15:00</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-blue-100 rounded-full inline-block mb-4 dark:bg-blue-900">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">البريد الإلكتروني</h3>
                <p className="text-gray-600 dark:text-gray-300">support@yemen-platform.gov.ye</p>
                <p className="text-gray-600 dark:text-gray-300">للاستفسارات والدعم التقني</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-blue-100 rounded-full inline-block mb-4 dark:bg-blue-900">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">الأمان والخصوصية</h3>
                <p className="text-gray-600 dark:text-gray-300">معلوماتك محمية بأعلى معايير الأمان</p>
                <Link href="/privacy">
                  <Button variant="link" className="p-0 h-auto">
                    اطلع على سياسة الخصوصية
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <Building2 className="h-8 w-8 text-blue-400" />
                <span className="mr-3 text-xl font-bold">منصة بناء اليمن</span>
              </div>
              <p className="text-gray-300 mb-4">
                منصة رقمية شاملة لتقديم الخدمات الحكومية للمواطنين والمقيمين في الجمهورية اليمنية
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">روابط سريعة</h3>
              <ul className="space-y-2">
                <li><Link href="#services" className="text-gray-300 hover:text-white">الخدمات</Link></li>
                <li><Link href="/citizen/track" className="text-gray-300 hover:text-white">تتبع طلب</Link></li>
                <li><Link href="/help" className="text-gray-300 hover:text-white">المساعدة</Link></li>
                <li><Link href="/contact" className="text-gray-300 hover:text-white">تواصل معنا</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">الدعم</h3>
              <ul className="space-y-2">
                <li><Link href="/faq" className="text-gray-300 hover:text-white">الأسئلة الشائعة</Link></li>
                <li><Link href="/guides" className="text-gray-300 hover:text-white">أدلة الاستخدام</Link></li>
                <li><Link href="/downloads" className="text-gray-300 hover:text-white">التحميلات</Link></li>
                <li><Link href="/feedback" className="text-gray-300 hover:text-white">التقييم والاقتراحات</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2025 منصة بناء اليمن. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}