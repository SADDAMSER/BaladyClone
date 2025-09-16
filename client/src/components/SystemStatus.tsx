import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { useRealTimeMonitoring } from "@/hooks/useRealTimeMonitoring";
import { useMetrics } from "@/hooks/useMetrics";

/**
 * Enhanced System Status Component with Real-time Data
 * مكون حالة النظام المحسن مع البيانات في الوقت الفعلي
 */

const getStatusInfo = (status: string, latency?: number) => {
  switch (status) {
    case 'healthy':
      return {
        label: latency !== undefined ? 'متصلة' : 'يعمل',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle2 className="h-3 w-3" />
      };
    case 'warning':
      return {
        label: 'بطيئة',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <AlertTriangle className="h-3 w-3" />
      };
    case 'error':
    case 'critical':
      return {
        label: 'خطأ',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertCircle className="h-3 w-3" />
      };
    default:
      return {
        label: 'غير معروف',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <AlertCircle className="h-3 w-3" />
      };
  }
};

export default function SystemStatus() {
  const { 
    systemMetrics, 
    isLoading, 
    refreshAll, 
    lastUpdate,
    healthStatus 
  } = useRealTimeMonitoring({
    refreshInterval: 30000, // 30 seconds
    notifications: { enabled: false, criticalOnly: false } // Disable notifications for this component
  });
  
  const { recordUserAction } = useMetrics();

  const handleRefresh = async () => {
    await refreshAll();
    recordUserAction('manual_refresh', 'SystemStatus');
  };

  // Prepare status items with real data
  const statusItems = [
    {
      id: "database",
      label: "قاعدة البيانات",
      status: systemMetrics?.health?.database?.status || 'unknown',
      latency: systemMetrics?.health?.database?.latency,
      details: systemMetrics?.health?.database?.latency ? 
        `${systemMetrics.health.database.latency}ms` : undefined
    },
    {
      id: "server",
      label: "الخادم",
      status: systemMetrics?.health?.server?.status || 'unknown',
      uptime: systemMetrics?.health?.server?.uptime,
      details: systemMetrics?.health?.server?.uptime ? 
        `${Math.floor(systemMetrics.health.server.uptime / 3600)}س` : undefined
    },
    {
      id: "memory",
      label: "الذاكرة",
      status: systemMetrics?.health?.memory?.status || 'unknown',
      usage: systemMetrics?.health?.memory?.usage,
      details: systemMetrics?.health?.memory?.usage ? 
        `${Math.round((systemMetrics.health.memory.usage.heapUsed / systemMetrics.health.memory.usage.heapTotal) * 100)}%` : undefined
    }
  ];

  return (
    <Card data-testid="system-status-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-cairo">حالة النظام</CardTitle>
          <div className="flex items-center gap-2">
            {/* Overall Health Indicator */}
            <Badge 
              className={`text-xs px-2 py-1 rounded-full ${getStatusInfo(healthStatus).color}`}
              data-testid="overall-health-badge"
            >
              <div className="flex items-center gap-1">
                {getStatusInfo(healthStatus).icon}
                {healthStatus === 'healthy' ? 'سليم' : 
                 healthStatus === 'warning' ? 'تحذير' : 
                 healthStatus === 'critical' ? 'حرج' : 'غير معروف'}
              </div>
            </Badge>
            
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              data-testid="button-refresh-status"
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Last Update Time */}
        {lastUpdate && (
          <div className="text-xs text-muted-foreground">
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-YE')}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {statusItems.map((item) => {
            const statusInfo = getStatusInfo(item.status, item.latency);
            
            return (
              <div 
                key={item.id} 
                className="flex justify-between items-center" 
                data-testid={`status-${item.id}`}
              >
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  {item.details && (
                    <span className="text-xs text-gray-500">{item.details}</span>
                  )}
                </div>
                
                <Badge className={`text-xs px-2 py-1 rounded-full border ${statusInfo.color}`}>
                  <div className="flex items-center gap-1">
                    {statusInfo.icon}
                    {statusInfo.label}
                  </div>
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Performance Summary */}
        {systemMetrics?.performance && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">زمن الاستجابة:</span>
                <div className="font-medium">
                  {Math.round(systemMetrics.performance.apiResponseTime)}ms
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">المستخدمون النشطون:</span>
                <div className="font-medium">
                  {systemMetrics.performance.uniqueUsers}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Summary */}
        {systemMetrics?.alerts && (systemMetrics.alerts.critical > 0 || systemMetrics.alerts.warnings > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4 text-xs">
              {systemMetrics.alerts.critical > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{systemMetrics.alerts.critical} تنبيه حرج</span>
                </div>
              )}
              {systemMetrics.alerts.warnings > 0 && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{systemMetrics.alerts.warnings} تحذير</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span>جاري تحديث البيانات...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
