import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Database, 
  MemoryStick, 
  Server, 
  Users, 
  Zap,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useMetrics } from "@/hooks/useMetrics";

/**
 * Comprehensive Real-time Monitoring Dashboard
 * لوحة مراقبة شاملة في الوقت الفعلي
 */

interface SystemHealth {
  overallHealth: 'healthy' | 'degraded' | 'critical';
  slo: {
    criticalSlos: any[];
    degradedServices: string[];
    overallSystemHealth: 'healthy' | 'degraded' | 'critical';
  };
  system: {
    database: { status: string; latency: number };
    server: { status: string; uptime: number };
    memory: { status: string; usage: any };
  };
  timestamp: string;
}

interface PerformanceMetrics {
  pageLoadTime: { avg: number; p95: number; count: number };
  apiResponseTime: { avg: number; p95: number; count: number };
  errorRate: number;
  uniqueUsers: number;
  timeRange: { from: Date; to: Date };
  metricsCount: number;
}

interface ErrorSummary {
  errors: any[];
  summary: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    affectedUsers: number;
    resolvedErrors: number;
  };
  timeRange: { from: Date; to: Date };
}

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}د ${hours}س ${minutes}د`;
  if (hours > 0) return `${hours}س ${minutes}د`;
  return `${minutes}د`;
};

const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
    case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'degraded': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'error':
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return <CheckCircle2 className="h-4 w-4" />;
    case 'warning': return <AlertTriangle className="h-4 w-4" />;
    case 'degraded': return <AlertCircle className="h-4 w-4" />;
    case 'error':
    case 'critical': return <AlertTriangle className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
};

export default function MonitoringDashboard() {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [timeframe, setTimeframe] = useState('24h');
  const { recordUserAction } = useMetrics();

  // Real-time system health
  const { data: systemHealth, isLoading: healthLoading, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ['/api/monitoring/health'],
    refetchInterval: refreshInterval
  });

  // Performance metrics
  const { data: performance, isLoading: perfLoading, refetch: refetchPerformance } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/monitoring/performance', timeframe],
    refetchInterval: refreshInterval
  });

  // Error tracking
  const { data: errorData, isLoading: errorsLoading, refetch: refetchErrors } = useQuery<ErrorSummary>({
    queryKey: ['/api/monitoring/errors', timeframe],
    refetchInterval: refreshInterval
  });

  // Dashboard data (comprehensive overview)
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['/api/monitoring/dashboard'],
    refetchInterval: refreshInterval
  });

  useEffect(() => {
    recordUserAction('view_monitoring_dashboard', 'MonitoringDashboard');
  }, [recordUserAction]);

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchHealth(),
      refetchPerformance(),
      refetchErrors(),
      refetchDashboard()
    ]);
    recordUserAction('manual_refresh', 'MonitoringDashboard');
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    recordUserAction('change_timeframe', 'MonitoringDashboard', { timeframe: newTimeframe });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" data-testid="monitoring-dashboard">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo">
              مراقبة النظام
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              مراقبة شاملة لحالة النظام والأداء في الوقت الفعلي
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Refresh Controls */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshAll}
              data-testid="button-refresh-all"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              تحديث
            </Button>
            
            {/* Auto-refresh interval */}
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-1 border rounded text-sm"
              data-testid="select-refresh-interval"
            >
              <option value={10000}>10 ثواني</option>
              <option value={30000}>30 ثانية</option>
              <option value={60000}>دقيقة</option>
              <option value={300000}>5 دقائق</option>
            </select>
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Overall System Health */}
        <Card data-testid="card-system-health">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">حالة النظام العامة</CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">جاري التحميل...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {getStatusIcon(systemHealth?.overallHealth || 'unknown')}
                <Badge className={getStatusColor(systemHealth?.overallHealth || 'unknown')}>
                  {systemHealth?.overallHealth === 'healthy' ? 'سليم' :
                   systemHealth?.overallHealth === 'degraded' ? 'متدهور' :
                   systemHealth?.overallHealth === 'critical' ? 'حرج' : 'غير معروف'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Health */}
        <Card data-testid="card-database-health">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              قاعدة البيانات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="text-sm text-gray-500">جاري التحميل...</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(systemHealth?.system?.database?.status || 'unknown')}
                  <Badge className={getStatusColor(systemHealth?.system?.database?.status || 'unknown')}>
                    {systemHealth?.system?.database?.status === 'healthy' ? 'متصلة' :
                     systemHealth?.system?.database?.status === 'warning' ? 'بطيئة' : 'خطأ'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  زمن الاستجابة: {systemHealth?.system?.database?.latency || 0}ms
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Server Uptime */}
        <Card data-testid="card-server-uptime">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              وقت التشغيل
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="text-sm text-gray-500">جاري التحميل...</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(systemHealth?.system?.server?.status || 'unknown')}
                  <Badge className={getStatusColor(systemHealth?.system?.server?.status || 'unknown')}>
                    يعمل
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  {formatUptime(systemHealth?.system?.server?.uptime || 0)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card data-testid="card-memory-usage">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MemoryStick className="h-4 w-4" />
              استخدام الذاكرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="text-sm text-gray-500">جاري التحميل...</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(systemHealth?.system?.memory?.status || 'unknown')}
                  <Badge className={getStatusColor(systemHealth?.system?.memory?.status || 'unknown')}>
                    {systemHealth?.system?.memory?.status === 'healthy' ? 'طبيعي' : 'عالي'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  {formatBytes(systemHealth?.system?.memory?.usage?.heapUsed || 0)} مستخدم
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance" data-testid="tab-performance">
            <Zap className="h-4 w-4 mr-2" />
            الأداء
          </TabsTrigger>
          <TabsTrigger value="errors" data-testid="tab-errors">
            <AlertTriangle className="h-4 w-4 mr-2" />
            الأخطاء
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            المستخدمون
          </TabsTrigger>
          <TabsTrigger value="slo" data-testid="tab-slo">
            <TrendingUp className="h-4 w-4 mr-2" />
            مؤشرات الجودة
          </TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6" data-testid="content-performance">
          <div className="flex gap-4 mb-4">
            <Button
              variant={timeframe === '1h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimeframeChange('1h')}
              data-testid="button-timeframe-1h"
            >
              ساعة
            </Button>
            <Button
              variant={timeframe === '6h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimeframeChange('6h')}
              data-testid="button-timeframe-6h"
            >
              6 ساعات
            </Button>
            <Button
              variant={timeframe === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimeframeChange('24h')}
              data-testid="button-timeframe-24h"
            >
              24 ساعة
            </Button>
            <Button
              variant={timeframe === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimeframeChange('7d')}
              data-testid="button-timeframe-7d"
            >
              أسبوع
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Page Load Time */}
            <Card data-testid="card-page-load-time">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  زمن تحميل الصفحة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <div className="text-sm text-gray-500">جاري التحميل...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-2xl font-bold">
                      {performance?.pageLoadTime?.avg?.toFixed(0) || 0}ms
                    </div>
                    <div className="text-xs text-gray-500">
                      متوسط من {performance?.pageLoadTime?.count || 0} تحميلة
                    </div>
                    <Progress 
                      value={Math.min((performance?.pageLoadTime?.avg || 0) / 50, 100)} 
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Response Time */}
            <Card data-testid="card-api-response-time">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  زمن استجابة API
                </CardTitle>
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <div className="text-sm text-gray-500">جاري التحميل...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-2xl font-bold">
                      {performance?.apiResponseTime?.avg?.toFixed(0) || 0}ms
                    </div>
                    <div className="text-xs text-gray-500">
                      متوسط من {performance?.apiResponseTime?.count || 0} طلب
                    </div>
                    <Progress 
                      value={Math.min((performance?.apiResponseTime?.avg || 0) / 20, 100)} 
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card data-testid="card-active-users">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  المستخدمون النشطون
                </CardTitle>
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <div className="text-sm text-gray-500">جاري التحميل...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-2xl font-bold">
                      {performance?.uniqueUsers || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      في آخر {timeframe}
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-xs">نشط</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-6" data-testid="content-errors">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card data-testid="card-total-errors">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">إجمالي الأخطاء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {errorData?.summary?.totalErrors || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-error-rate">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">معدل الأخطاء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((errorData?.summary?.totalErrors || 0) / Math.max(performance?.metricsCount || 1, 1) * 100).toFixed(2)}%
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-affected-users">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">المستخدمون المتأثرون</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {errorData?.summary?.affectedUsers || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-resolved-errors">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">الأخطاء المحلولة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {errorData?.summary?.resolvedErrors || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Types Breakdown */}
          <Card data-testid="card-error-types">
            <CardHeader>
              <CardTitle>أنواع الأخطاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(errorData?.summary?.errorsByType || {}).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{count}</span>
                      <Progress 
                        value={(count / Math.max(...Object.values(errorData?.summary?.errorsByType || {}))) * 100} 
                        className="w-20 h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6" data-testid="content-users">
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات المستخدمين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                قريباً - تحليلات تفصيلية للمستخدمين
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLO Tab */}
        <TabsContent value="slo" className="space-y-6" data-testid="content-slo">
          <Card>
            <CardHeader>
              <CardTitle>مؤشرات الجودة (SLO)</CardTitle>
            </CardHeader>
            <CardContent>
              {systemHealth?.slo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">SLOs الحرجة</h3>
                      <div className="text-2xl font-bold text-red-600">
                        {systemHealth.slo.criticalSlos.length}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">الخدمات المتدهورة</h3>
                      <div className="text-2xl font-bold text-orange-600">
                        {systemHealth.slo.degradedServices.length}
                      </div>
                    </div>
                  </div>
                  
                  {systemHealth.slo.degradedServices.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">الخدمات المتأثرة</h3>
                      <div className="flex flex-wrap gap-2">
                        {systemHealth.slo.degradedServices.map((service) => (
                          <Badge key={service} variant="destructive">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  جاري تحميل مؤشرات الجودة...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}