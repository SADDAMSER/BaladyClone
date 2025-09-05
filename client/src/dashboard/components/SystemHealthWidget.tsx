import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Server, 
  Database, 
  Wifi, 
  HardDrive, 
  Cpu,
  CheckCircle,
  AlertTriangle,
  XCircle
} from "lucide-react";

interface SystemMetric {
  id: string;
  label: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ComponentType<{ className?: string }>;
  unit?: string;
  description: string;
}

const systemMetrics: SystemMetric[] = [
  {
    id: "server-uptime",
    label: "وقت التشغيل",
    value: 99.8,
    status: "healthy",
    icon: Server,
    unit: "%",
    description: "الخادم يعمل بكفاءة عالية"
  },
  {
    id: "database-performance",
    label: "أداء قاعدة البيانات",
    value: 95.2,
    status: "healthy", 
    icon: Database,
    unit: "%",
    description: "استجابة سريعة للاستعلامات"
  },
  {
    id: "network-connectivity",
    label: "الاتصال بالشبكة",
    value: 98.5,
    status: "healthy",
    icon: Wifi,
    unit: "%",
    description: "اتصال مستقر بالإنترنت"
  },
  {
    id: "storage-usage",
    label: "مساحة التخزين",
    value: 73.2,
    status: "warning",
    icon: HardDrive,
    unit: "%",
    description: "مساحة التخزين تحتاج مراقبة"
  },
  {
    id: "cpu-usage",
    label: "استخدام المعالج",
    value: 45.8,
    status: "healthy",
    icon: Cpu,
    unit: "%",
    description: "استخدام طبيعي للمعالج"
  }
];

const getStatusInfo = (status: SystemMetric['status']) => {
  switch (status) {
    case 'healthy':
      return {
        color: 'text-green-600',
        bg: 'bg-green-100 dark:bg-green-900',
        icon: CheckCircle,
        badge: { variant: 'default' as const, label: 'سليم' }
      };
    case 'warning':
      return {
        color: 'text-yellow-600',
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        icon: AlertTriangle,
        badge: { variant: 'outline' as const, label: 'تحذير' }
      };
    case 'critical':
      return {
        color: 'text-red-600',
        bg: 'bg-red-100 dark:bg-red-900',
        icon: XCircle,
        badge: { variant: 'destructive' as const, label: 'حرج' }
      };
    default:
      return {
        color: 'text-gray-600',
        bg: 'bg-gray-100 dark:bg-gray-900',
        icon: CheckCircle,
        badge: { variant: 'secondary' as const, label: 'غير محدد' }
      };
  }
};

const getProgressColor = (status: SystemMetric['status']) => {
  switch (status) {
    case 'healthy':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'critical':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

export default function SystemHealthWidget() {
  const overallHealth = systemMetrics.reduce((acc, metric) => acc + metric.value, 0) / systemMetrics.length;
  const criticalIssues = systemMetrics.filter(m => m.status === 'critical').length;
  const warnings = systemMetrics.filter(m => m.status === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">صحة النظام</CardTitle>
          <Badge 
            variant={overallHealth > 95 ? "default" : overallHealth > 80 ? "outline" : "destructive"}
          >
            {overallHealth.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overall Status */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">الحالة العامة</span>
            <div className="flex gap-2">
              {criticalIssues > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalIssues} مشاكل حرجة
                </Badge>
              )}
              {warnings > 0 && (
                <Badge variant="outline" className="text-xs">
                  {warnings} تحذيرات
                </Badge>
              )}
            </div>
          </div>
          <Progress 
            value={overallHealth} 
            className="h-2"
          />
        </div>

        {/* Individual Metrics */}
        <div className="space-y-4">
          {systemMetrics.map((metric) => {
            const statusInfo = getStatusInfo(metric.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={metric.id}
                className="space-y-2"
                data-testid={`system-metric-${metric.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${statusInfo.bg}`}>
                      <metric.icon className={`h-3 w-3 ${statusInfo.color}`} />
                    </div>
                    <span className="text-sm font-medium">{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {metric.value.toFixed(1)}{metric.unit}
                    </span>
                    <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
                  </div>
                </div>
                
                <Progress 
                  value={metric.value} 
                  className="h-1.5"
                />
                
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex gap-2">
            <button className="flex-1 text-xs py-2 px-3 bg-muted rounded-md hover:bg-muted/80 transition-colors">
              تفاصيل أكثر
            </button>
            <button className="flex-1 text-xs py-2 px-3 bg-muted rounded-md hover:bg-muted/80 transition-colors">
              تشخيص الأداء
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}