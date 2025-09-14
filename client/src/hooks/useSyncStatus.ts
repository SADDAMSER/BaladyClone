import { useState, useEffect } from 'react';
import { useMobileSyncContext } from '@/contexts/MobileSyncContext';

export interface ConnectionStatus {
  isOnline: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  estimatedSpeed: 'fast' | 'medium' | 'slow' | 'unknown';
  lastConnectedAt?: string;
}

export interface SyncHealthCheck {
  overallHealth: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  lastHealthCheck: string;
}

/**
 * Enhanced Sync Status Hook - provides detailed sync and connection monitoring
 * مراقبة حالة المزامنة والاتصال المتقدمة
 */
export function useSyncStatus() {
  const { 
    syncStatus, 
    syncSession, 
    syncInfo, 
    lastSyncAge,
    hasAnyPendingData,
    isFieldWorker
  } = useMobileSyncContext();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    connectionQuality: navigator.onLine ? 'good' : 'offline',
    estimatedSpeed: 'unknown'
  });

  const [healthCheck, setHealthCheck] = useState<SyncHealthCheck>({
    overallHealth: 'healthy',
    issues: [],
    recommendations: [],
    lastHealthCheck: new Date().toISOString()
  });

  // Monitor connection quality
  useEffect(() => {
    const checkConnectionQuality = async () => {
      if (!navigator.onLine) {
        setConnectionStatus(prev => ({
          ...prev,
          isOnline: false,
          connectionQuality: 'offline',
          estimatedSpeed: 'unknown'
        }));
        return;
      }

      try {
        const startTime = performance.now();
        const response = await fetch('/api/health', { 
          method: 'GET',
          cache: 'no-cache'
        });
        const endTime = performance.now();
        const pingTime = endTime - startTime;

        let quality: ConnectionStatus['connectionQuality'] = 'excellent';
        let speed: ConnectionStatus['estimatedSpeed'] = 'fast';

        if (pingTime > 2000) {
          quality = 'poor';
          speed = 'slow';
        } else if (pingTime > 1000) {
          quality = 'good';
          speed = 'medium';
        }

        setConnectionStatus(prev => ({
          ...prev,
          isOnline: true,
          connectionQuality: quality,
          estimatedSpeed: speed,
          lastConnectedAt: new Date().toISOString()
        }));
      } catch (error) {
        setConnectionStatus(prev => ({
          ...prev,
          isOnline: false,
          connectionQuality: 'offline',
          estimatedSpeed: 'unknown'
        }));
      }
    };

    // Initial check
    checkConnectionQuality();

    // Check every 30 seconds
    const interval = setInterval(checkConnectionQuality, 30000);

    return () => clearInterval(interval);
  }, []);

  // Health check analysis
  useEffect(() => {
    const performHealthCheck = () => {
      const issues: string[] = [];
      const recommendations: string[] = [];
      let overallHealth: SyncHealthCheck['overallHealth'] = 'healthy';

      // Check connection issues
      if (!connectionStatus.isOnline) {
        issues.push('لا يوجد اتصال بالإنترنت');
        recommendations.push('تحقق من اتصال الإنترنت أو الواي فاي');
        overallHealth = 'critical';
      } else if (connectionStatus.connectionQuality === 'poor') {
        issues.push('جودة الاتصال ضعيفة');
        recommendations.push('انتقل إلى منطقة بإشارة أفضل أو استخدم واي فاي');
        if (overallHealth === 'healthy') overallHealth = 'warning';
      }

      // Check sync age
      if (lastSyncAge && lastSyncAge > 30) { // More than 30 minutes
        issues.push(`آخر مزامنة كانت منذ ${lastSyncAge} دقيقة`);
        recommendations.push('قم بالمزامنة اليدوية أو تحقق من الاتصال');
        if (overallHealth === 'healthy') overallHealth = 'warning';
      }

      // Check pending data
      if (hasAnyPendingData && syncStatus.pendingOperations > 10) {
        issues.push(`${syncStatus.pendingOperations} عملية في انتظار المزامنة`);
        recommendations.push('قم بالمزامنة لتجنب فقدان البيانات');
        if (overallHealth === 'healthy') overallHealth = 'warning';
      }

      // Check failed operations
      if (syncStatus.failedOperations > 0) {
        issues.push(`${syncStatus.failedOperations} عملية فشلت في المزامنة`);
        recommendations.push('تحقق من البيانات وحاول المزامنة مرة أخرى');
        overallHealth = 'critical';
      }

      // Field worker specific checks
      if (isFieldWorker) {
        if (!connectionStatus.isOnline && !hasAnyPendingData) {
          recommendations.push('يمكنك العمل دون اتصال - سيتم المزامنة عند عودة الاتصال');
        }
        
        if (connectionStatus.isOnline && hasAnyPendingData) {
          recommendations.push('مزامنة البيانات متاحة - ارسل البيانات المحلية إلى السيرفر');
        }
      }

      setHealthCheck({
        overallHealth,
        issues,
        recommendations,
        lastHealthCheck: new Date().toISOString()
      });
    };

    performHealthCheck();

    // Run health check every minute
    const interval = setInterval(performHealthCheck, 60000);

    return () => clearInterval(interval);
  }, [
    connectionStatus, 
    lastSyncAge, 
    hasAnyPendingData, 
    syncStatus.pendingOperations, 
    syncStatus.failedOperations,
    isFieldWorker
  ]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus(prev => ({
        ...prev,
        isOnline: true,
        lastConnectedAt: new Date().toISOString()
      }));
    };

    const handleOffline = () => {
      setConnectionStatus(prev => ({
        ...prev,
        isOnline: false,
        connectionQuality: 'offline',
        estimatedSpeed: 'unknown'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Status indicators for UI
  const getStatusColor = () => {
    if (healthCheck.overallHealth === 'critical') return 'red';
    if (healthCheck.overallHealth === 'warning') return 'yellow';
    return 'green';
  };

  const getStatusIcon = () => {
    if (!connectionStatus.isOnline) return 'wifi-off';
    if (syncStatus.isSyncing) return 'refresh-cw';
    if (healthCheck.overallHealth === 'critical') return 'alert-circle';
    if (healthCheck.overallHealth === 'warning') return 'alert-triangle';
    return 'check-circle';
  };

  const getStatusMessage = () => {
    if (!connectionStatus.isOnline) return 'غير متصل';
    if (syncStatus.isSyncing) return 'جاري المزامنة...';
    if (healthCheck.overallHealth === 'critical') return 'مشكلة حرجة';
    if (healthCheck.overallHealth === 'warning') return 'تحذير';
    return 'متصل ومُحدث';
  };

  return {
    // Core status
    syncStatus,
    connectionStatus,
    healthCheck,
    syncSession,

    // Computed indicators
    statusColor: getStatusColor(),
    statusIcon: getStatusIcon(),
    statusMessage: getStatusMessage(),

    // Utility flags
    canWorkOffline: isFieldWorker,
    needsAttention: healthCheck.overallHealth !== 'healthy',
    shouldShowWarning: healthCheck.issues.length > 0,
    isFullyOperational: connectionStatus.isOnline && healthCheck.overallHealth === 'healthy',

    // Time-based info
    lastSyncAge,
    timeSinceLastConnection: connectionStatus.lastConnectedAt 
      ? Math.round((Date.now() - new Date(connectionStatus.lastConnectedAt).getTime()) / 1000 / 60)
      : null
  };
}

export default useSyncStatus;