import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

/**
 * Real-time System Monitoring Hook
 * هوك مراقبة النظام في الوقت الفعلي
 */

export interface SystemMetrics {
  health: {
    overall: 'healthy' | 'degraded' | 'critical';
    database: { status: string; latency: number };
    server: { status: string; uptime: number };
    memory: { status: string; usage: any };
  };
  performance: {
    pageLoadTime: number;
    apiResponseTime: number;
    errorRate: number;
    uniqueUsers: number;
  };
  alerts: {
    critical: number;
    warnings: number;
    recent: any[];
  };
  timestamp: string;
}

export interface MonitoringAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  service?: string;
  metric?: string;
}

export interface MonitoringConfig {
  refreshInterval: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    diskUsage: number;
  };
  notifications: {
    enabled: boolean;
    criticalOnly: boolean;
  };
}

const DEFAULT_CONFIG: MonitoringConfig = {
  refreshInterval: 30000, // 30 seconds
  alertThresholds: {
    responseTime: 1000, // 1 second
    errorRate: 5, // 5%
    memoryUsage: 80, // 80%
    diskUsage: 90 // 90%
  },
  notifications: {
    enabled: true,
    criticalOnly: false
  }
};

export function useRealTimeMonitoring(config: Partial<MonitoringConfig> = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // System health monitoring
  const { 
    data: healthData, 
    isLoading: healthLoading, 
    isError: healthError,
    refetch: refetchHealth 
  } = useQuery({
    queryKey: ['/api/monitoring/health'],
    refetchInterval: isMonitoring ? mergedConfig.refreshInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 10000 // Data is fresh for 10 seconds
  });

  // Performance metrics monitoring
  const { 
    data: performanceData, 
    isLoading: performanceLoading,
    refetch: refetchPerformance 
  } = useQuery({
    queryKey: ['/api/monitoring/performance', '1h'],
    refetchInterval: isMonitoring ? mergedConfig.refreshInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 15000 // Data is fresh for 15 seconds
  });

  // Error tracking monitoring
  const { 
    data: errorData, 
    isLoading: errorLoading,
    refetch: refetchErrors 
  } = useQuery({
    queryKey: ['/api/monitoring/errors', '1h'],
    refetchInterval: isMonitoring ? mergedConfig.refreshInterval * 2 : false, // Less frequent
    refetchIntervalInBackground: true,
    staleTime: 30000 // Data is fresh for 30 seconds
  });

  // Generate alerts based on metrics
  const generateAlerts = useCallback((health: any, performance: any, errors: any) => {
    const newAlerts: MonitoringAlert[] = [];
    const now = new Date().toISOString();

    // Health-based alerts
    if (health?.overallHealth === 'critical') {
      newAlerts.push({
        id: `health_critical_${Date.now()}`,
        type: 'critical',
        title: 'حالة النظام حرجة',
        message: 'النظام في حالة حرجة وقد يحتاج تدخل فوري',
        timestamp: now,
        resolved: false,
        service: 'system'
      });
    }

    if (health?.system?.database?.status === 'error') {
      newAlerts.push({
        id: `db_error_${Date.now()}`,
        type: 'critical',
        title: 'خطأ في قاعدة البيانات',
        message: 'فشل في الاتصال بقاعدة البيانات',
        timestamp: now,
        resolved: false,
        service: 'database'
      });
    }

    if (health?.system?.database?.latency > mergedConfig.alertThresholds.responseTime) {
      newAlerts.push({
        id: `db_slow_${Date.now()}`,
        type: 'warning',
        title: 'قاعدة البيانات بطيئة',
        message: `زمن الاستجابة ${health.system.database.latency}ms يتجاوز الحد المسموح`,
        timestamp: now,
        resolved: false,
        service: 'database',
        metric: 'latency'
      });
    }

    // Performance-based alerts
    if (performance?.apiResponseTime?.avg > mergedConfig.alertThresholds.responseTime) {
      newAlerts.push({
        id: `api_slow_${Date.now()}`,
        type: 'warning',
        title: 'بطء في استجابة API',
        message: `متوسط زمن الاستجابة ${performance.apiResponseTime.avg.toFixed(0)}ms`,
        timestamp: now,
        resolved: false,
        service: 'api',
        metric: 'response_time'
      });
    }

    // Error-based alerts
    const errorRate = (errors?.summary?.totalErrors || 0) / Math.max(performance?.metricsCount || 1, 1) * 100;
    if (errorRate > mergedConfig.alertThresholds.errorRate) {
      newAlerts.push({
        id: `error_rate_${Date.now()}`,
        type: errorRate > 10 ? 'critical' : 'warning',
        title: 'معدل أخطاء عالي',
        message: `معدل الأخطاء ${errorRate.toFixed(1)}% يتجاوز الحد المسموح`,
        timestamp: now,
        resolved: false,
        service: 'system',
        metric: 'error_rate'
      });
    }

    // Memory usage alerts
    const memoryUsage = health?.system?.memory?.usage;
    if (memoryUsage) {
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (memoryPercent > mergedConfig.alertThresholds.memoryUsage) {
        newAlerts.push({
          id: `memory_high_${Date.now()}`,
          type: memoryPercent > 90 ? 'critical' : 'warning',
          title: 'استخدام ذاكرة عالي',
          message: `استخدام الذاكرة ${memoryPercent.toFixed(1)}%`,
          timestamp: now,
          resolved: false,
          service: 'system',
          metric: 'memory'
        });
      }
    }

    return newAlerts;
  }, [mergedConfig.alertThresholds]);

  // Process new alerts and show notifications
  const processAlerts = useCallback((newAlerts: MonitoringAlert[]) => {
    if (newAlerts.length === 0) return;

    // Update alerts state
    setAlerts(prev => {
      // Merge new alerts, avoiding duplicates based on type and service
      const existingKeys = new Set(
        prev.filter(alert => !alert.resolved)
             .map(alert => `${alert.type}_${alert.service}_${alert.metric}`)
      );

      const uniqueNewAlerts = newAlerts.filter(alert => 
        !existingKeys.has(`${alert.type}_${alert.service}_${alert.metric}`)
      );

      return [...prev, ...uniqueNewAlerts];
    });

    // Show toast notifications
    if (mergedConfig.notifications.enabled) {
      newAlerts.forEach(alert => {
        if (!mergedConfig.notifications.criticalOnly || alert.type === 'critical') {
          toast({
            title: alert.title,
            description: alert.message,
            variant: alert.type === 'critical' ? 'destructive' : 'default',
          });
        }
      });
    }
  }, [mergedConfig.notifications, toast]);

  // Monitor data changes and generate alerts
  useEffect(() => {
    if (healthData && performanceData && errorData) {
      const newAlerts = generateAlerts(healthData, performanceData, errorData);
      processAlerts(newAlerts);
      setLastUpdate(new Date());
    }
  }, [healthData, performanceData, errorData, generateAlerts, processAlerts]);

  // Aggregate system metrics
  const systemMetrics: SystemMetrics | null = healthData && performanceData ? {
    health: {
      overall: (healthData as any).overallHealth || 'unknown',
      database: (healthData as any).system?.database || { status: 'unknown', latency: 0 },
      server: (healthData as any).system?.server || { status: 'unknown', uptime: 0 },
      memory: (healthData as any).system?.memory || { status: 'unknown', usage: {} }
    },
    performance: {
      pageLoadTime: (performanceData as any).pageLoadTime?.avg || 0,
      apiResponseTime: (performanceData as any).apiResponseTime?.avg || 0,
      errorRate: ((errorData as any)?.summary?.totalErrors || 0) / Math.max((performanceData as any).metricsCount || 1, 1) * 100,
      uniqueUsers: (performanceData as any).uniqueUsers || 0
    },
    alerts: {
      critical: alerts.filter(a => !a.resolved && a.type === 'critical').length,
      warnings: alerts.filter(a => !a.resolved && a.type === 'warning').length,
      recent: alerts.slice(-10)
    },
    timestamp: new Date().toISOString()
  } : null;

  // Control functions
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchHealth(),
      refetchPerformance(),
      refetchErrors()
    ]);
  }, [refetchHealth, refetchPerformance, refetchErrors]);

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true }
          : alert
      )
    );
  }, []);

  const clearResolvedAlerts = useCallback(() => {
    setAlerts(prev => prev.filter(alert => !alert.resolved));
  }, []);

  const getHealthStatus = useCallback(() => {
    if (!systemMetrics) return 'unknown';
    
    const { health, performance, alerts } = systemMetrics;
    
    // Critical conditions
    if (health.overall === 'critical' || alerts.critical > 0) {
      return 'critical';
    }
    
    // Warning conditions
    if (health.overall === 'degraded' || 
        alerts.warnings > 0 ||
        performance.errorRate > 5 ||
        performance.apiResponseTime > 1000) {
      return 'warning';
    }
    
    return 'healthy';
  }, [systemMetrics]);

  return {
    // Data
    systemMetrics,
    alerts: alerts.filter(alert => !alert.resolved),
    allAlerts: alerts,
    isLoading: healthLoading || performanceLoading || errorLoading,
    isError: healthError,
    lastUpdate,
    
    // Status
    isMonitoring,
    healthStatus: getHealthStatus(),
    
    // Controls
    startMonitoring,
    stopMonitoring,
    refreshAll,
    resolveAlert,
    clearResolvedAlerts,
    
    // Configuration
    config: mergedConfig,
    
    // Individual data sources
    healthData,
    performanceData,
    errorData
  };
}