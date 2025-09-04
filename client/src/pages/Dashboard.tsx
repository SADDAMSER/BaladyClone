import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import StatsCard from "@/components/StatsCard";
import ServiceCard from "@/components/ServiceCard";
import QuickActions from "@/components/QuickActions";
import SystemStatus from "@/components/SystemStatus";
import LegalEngineDemo from "@/components/LegalEngineDemo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Building, Map, Cog, Scale, Table, ListTodo, Zap, BarChart3 } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
  });

  const servicesData = [
    {
      id: "building-licenses",
      title: "تراخيص البناء",
      description: "إصدار وتجديد تراخيص البناء",
      icon: Building,
      color: "primary",
      badgeText: "45 طلب جديد",
      href: "/building-licenses"
    },
    {
      id: "surveying-decision",
      title: "القرار المساحي",
      description: "خدمة القرار المساحي الرقمي",
      icon: Map,
      color: "secondary",
      badgeText: "23 طلب جديد",
      href: "/surveying-decision"
    },
    {
      id: "technical-requirements",
      title: "الاشتراطات الفنية",
      description: "دليل الاشتراطات الذكي",
      icon: Cog,
      color: "accent",
      badgeText: "167 اشتراط",
      href: "/technical-requirements"
    },
    {
      id: "legal-system",
      title: "النظام القانوني",
      description: "محرك قوانين البناء الذكي",
      icon: Scale,
      color: "primary",
      badgeText: "144 مادة",
      href: "/legal-system"
    },
    {
      id: "organizational-structure",
      title: "الهيكل التنظيمي",
      description: "إدارة المناصب والصلاحيات",
      icon: Table,
      color: "secondary",
      badgeText: "85 موظف",
      href: "/organizational-structure"
    },
    {
      id: "task-management", 
      title: "إدارة المهام",
      description: "متابعة سير العمل",
      icon: ListTodo,
      color: "accent",
      badgeText: "127 مهمة",
      href: "/task-management"
    },
    {
      id: "advanced-analytics",
      title: "التحليلات المتقدمة",
      description: "تقارير وإحصائيات شاملة",
      icon: BarChart3,
      color: "primary",
      badgeText: "مؤشرات مباشرة",
      href: "/advanced-analytics"
    },
    {
      id: "service-builder",
      title: "منشئ الخدمات الذكي",
      description: "إنشاء خدمات جديدة بدون كود",
      icon: Zap,
      color: "destructive", 
      badgeText: "جديد",
      href: "/service-builder"
    }
  ];

  const recentActivities = [
    {
      id: 1,
      text: "تم اعتماد طلب رخصة بناء #2024-001",
      time: "منذ ساعتين",
      color: "primary"
    },
    {
      id: 2,
      text: "قرار مساحي جديد في انتظار المراجعة",
      time: "منذ 3 ساعات",
      color: "secondary"
    },
    {
      id: 3,
      text: "تحديث في النظام القانوني",
      time: "منذ يوم واحد",
      color: "accent"
    }
  ];

  const notifications = [
    {
      id: 1,
      type: "info",
      title: "تحديث جديد",
      description: "تم إضافة ميزات جديدة لنظام الاشتراطات",
      color: "primary"
    },
    {
      id: 2,
      type: "warning",
      title: "صيانة مجدولة",
      description: "سيتم إيقاف الخدمة مؤقتاً يوم السبت",
      color: "accent"
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6 mb-8 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2 font-cairo">أهلاً بك في منصة بناء اليمن</h2>
              <p className="text-muted-foreground">منصة شاملة لجميع الخدمات البلدية والعمرانية الرقمية</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Building className="text-primary text-2xl" size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="المعاملات النشطة"
            value={(stats && typeof stats === 'object' && 'activeApplications' in stats) ? stats.activeApplications : 1247}
            icon={Building}
            color="primary"
            isLoading={statsLoading}
            data-testid="stats-active-applications"
          />
          <StatsCard
            title="التراخيص الصادرة"
            value={(stats && typeof stats === 'object' && 'issuedLicenses' in stats) ? stats.issuedLicenses : 892}
            icon={Building}
            color="secondary"
            isLoading={statsLoading}
            data-testid="stats-issued-licenses"
          />
          <StatsCard
            title="القرارات المساحية"
            value={(stats && typeof stats === 'object' && 'surveyingDecisions' in stats) ? stats.surveyingDecisions : 156}
            icon={Map}
            color="accent"
            isLoading={statsLoading}
            data-testid="stats-surveying-decisions"
          />
          <StatsCard
            title="معدل الرضا"
            value={`${(stats && typeof stats === 'object' && 'satisfactionRate' in stats) ? stats.satisfactionRate : 98.5}%`}
            icon={Building}
            color="primary"
            isLoading={statsLoading}
            data-testid="stats-satisfaction-rate"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Services Column */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-semibold text-foreground mb-4 font-cairo">الخدمات الرئيسية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {servicesData.map((service) => (
                <ServiceCard
                  key={service.id}
                  title={service.title}
                  description={service.description}
                  icon={service.icon}
                  color={service.color}
                  badgeText={service.badgeText}
                  href={service.href}
                  data-testid={`service-card-${service.id}`}
                />
              ))}
            </div>

            {/* Advanced Search */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-foreground mb-4 font-cairo">البحث الذكي</h3>
              <Card>
                <CardContent className="p-6">
                  <div className="flex space-x-4 space-x-reverse mb-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="ابحث في القوانين، الخدمات، أو المعاملات..."
                        className="w-full"
                        data-testid="input-global-search"
                      />
                    </div>
                    <Button 
                      className="px-6 py-3"
                      data-testid="button-search"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["قانون البناء", "التراخيص", "الاشتراطات", "المساحة"].map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        data-testid={`search-tag-${tag}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <QuickActions />

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">الأنشطة الحديثة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="recent-activities">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex space-x-3 space-x-reverse">
                      <div className={`w-2 h-2 bg-${activity.color} rounded-full mt-2 flex-shrink-0`}></div>
                      <div className="text-sm">
                        <p className="text-foreground">{activity.text}</p>
                        <p className="text-muted-foreground text-xs">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <SystemStatus />

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">الإشعارات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" data-testid="notifications">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-3 bg-${notification.color}/5 border border-${notification.color}/20 rounded-lg`}>
                      <div className="flex items-start space-x-3 space-x-reverse">
                        <div className="text-sm">
                          <p className="text-foreground font-medium">{notification.title}</p>
                          <p className="text-muted-foreground">{notification.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <LegalEngineDemo />
      </div>
    </div>
  );
}
