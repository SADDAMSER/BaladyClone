import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import KPICard from "../components/KPICard";
import QuickActionsWidget from "../components/QuickActionsWidget";
import RecentActivityWidget from "../components/RecentActivityWidget";
import SystemHealthWidget from "../components/SystemHealthWidget";
import ApplicationsChart from "../components/ApplicationsChart";
import ServicesChart from "../components/ServicesChart";
import {
  Building,
  FileText,
  Map,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Activity,
  Star,
  Target
} from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/applications/recent"],
  });

  const kpiData = [
    {
      title: "إجمالي المعاملات النشطة",
      value: (stats && typeof stats === 'object' && 'activeApplications' in stats) ? (stats.activeApplications as number) : 1247,
      change: { value: 12, type: "increase" as const, period: "هذا الشهر" },
      icon: FileText,
      color: "blue" as const,
      description: "المعاملات قيد المراجعة والمعالجة"
    },
    {
      title: "التراخيص الصادرة",
      value: (stats && typeof stats === 'object' && 'issuedLicenses' in stats) ? (stats.issuedLicenses as number) : 892,
      change: { value: 8, type: "increase" as const, period: "هذا الأسبوع" },
      icon: Building,
      color: "green" as const,
      description: "التراخيص المكتملة والصادرة"
    },
    {
      title: "القرارات المساحية",
      value: (stats && typeof stats === 'object' && 'surveyingDecisions' in stats) ? (stats.surveyingDecisions as number) : 156,
      change: { value: 3, type: "decrease" as const, period: "اليوم" },
      icon: Map,
      color: "yellow" as const,
      description: "القرارات المساحية المعتمدة"
    },
    {
      title: "معدل الرضا",
      value: `${(stats && typeof stats === 'object' && 'satisfactionRate' in stats) ? (stats.satisfactionRate as number) : 98.5}%`,
      change: { value: 2.1, type: "increase" as const, period: "هذا الشهر" },
      icon: Star,
      color: "green" as const,
      description: "رضا المستخدمين عن الخدمات"
    },
    {
      title: "المستخدمين النشطين",
      value: (stats && typeof stats === 'object' && 'activeUsers' in stats) ? (stats.activeUsers as number) : 2341,
      change: { value: 5, type: "increase" as const, period: "اليوم" },
      icon: Users,
      color: "purple" as const,
      description: "المستخدمين المتصلين حالياً"
    },
    {
      title: "متوسط وقت المعالجة",
      value: `${(stats && typeof stats === 'object' && 'avgProcessingTime' in stats) ? (stats.avgProcessingTime as number) : 2.3} يوم`,
      change: { value: 0.5, type: "decrease" as const, period: "هذا الأسبوع" },
      icon: Clock,
      color: "blue" as const,
      description: "متوسط وقت معالجة الطلبات"
    },
    {
      title: "معدل الإنجاز",
      value: `${(stats && typeof stats === 'object' && 'completionRate' in stats) ? (stats.completionRate as number) : 94.2}%`,
      change: { value: 1.8, type: "increase" as const, period: "هذا الشهر" },
      icon: Target,
      color: "green" as const,
      description: "نسبة الطلبات المكتملة"
    },
    {
      title: "صحة النظام",
      value: `${(stats && typeof stats === 'object' && 'systemHealth' in stats) ? (stats.systemHealth as number) : 99.8}%`,
      change: { value: 0.1, type: "increase" as const, period: "اليوم" },
      icon: Activity,
      color: "green" as const,
      description: "حالة أداء النظام العامة"
    }
  ];

  const quickStats = [
    {
      label: "طلبات اليوم",
      value: 45,
      icon: FileText,
      color: "text-blue-600"
    },
    {
      label: "في انتظار المراجعة",
      value: 12,
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      label: "مكتملة اليوم",
      value: 23,
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      label: "تحتاج متابعة",
      value: 7,
      icon: AlertTriangle,
      color: "text-red-600"
    }
  ];

  const recentApplications = [
    {
      id: "APP-2024-001",
      type: "رخصة بناء",
      applicant: "أحمد محمد الزهراني",
      status: "قيد المراجعة",
      date: "2024-01-15",
      priority: "عالية"
    },
    {
      id: "APP-2024-002",
      type: "قرار مساحي",
      applicant: "فاطمة علي الحداد",
      status: "معتمد",
      date: "2024-01-14",
      priority: "متوسطة"
    },
    {
      id: "APP-2024-003",
      type: "اشتراطات فنية",
      applicant: "محمد سعد البكري",
      status: "في انتظار المستندات",
      date: "2024-01-13",
      priority: "منخفضة"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2 font-cairo">
              مرحباً بك في لوحة التحكم الإدارية
            </h2>
            <p className="text-muted-foreground">
              إدارة شاملة لجميع خدمات منصة بناء اليمن الرقمية
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">99.8%</div>
              <div className="text-xs text-muted-foreground">نسبة التشغيل</div>
            </div>
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <Building className="text-primary" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Main KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <KPICard
            key={index}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            icon={kpi.icon}
            color={kpi.color}
            description={kpi.description}
            loading={statsLoading}
            data-testid={`kpi-card-${index}`}
          />
        ))}
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              تطور المعاملات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationsChart />
          </CardContent>
        </Card>

        {/* Services Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              توزيع الخدمات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ServicesChart />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>الطلبات الحديثة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{app.id}</span>
                      <Badge variant="outline">{app.type}</Badge>
                      <Badge 
                        variant={
                          app.priority === "عالية" ? "destructive" :
                          app.priority === "متوسطة" ? "default" : "secondary"
                        }
                      >
                        {app.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{app.applicant}</div>
                    <div className="text-xs text-muted-foreground">{app.date}</div>
                  </div>
                  <div className="text-left">
                    <Badge 
                      variant={
                        app.status === "معتمد" ? "default" :
                        app.status === "قيد المراجعة" ? "secondary" : "outline"
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                عرض جميع الطلبات
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Sidebar Widgets */}
        <div className="space-y-6">
          <QuickActionsWidget />
          <SystemHealthWidget />
          <RecentActivityWidget />
        </div>
      </div>
    </div>
  );
}