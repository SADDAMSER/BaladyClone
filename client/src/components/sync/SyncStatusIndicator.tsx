import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Clock,
  Database,
  Signal
} from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useMobileSyncContext } from '@/contexts/MobileSyncContext';

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
  compact?: boolean;
  showActions?: boolean;
}

export function SyncStatusIndicator({ 
  showDetails = true, 
  compact = false,
  showActions = true 
}: SyncStatusIndicatorProps) {
  const {
    connectionStatus,
    healthCheck,
    statusColor,
    statusIcon,
    statusMessage,
    lastSyncAge,
    needsAttention,
    isFullyOperational
  } = useSyncStatus();

  const {
    syncStatus,
    triggerSync,
    isFieldWorker,
    canSync,
    hasAnyPendingData
  } = useMobileSyncContext();

  const getStatusIconComponent = () => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (statusIcon) {
      case 'wifi-off':
        return <WifiOff {...iconProps} />;
      case 'refresh-cw':
        return <RefreshCw {...iconProps} className="animate-spin" />;
      case 'alert-circle':
        return <AlertCircle {...iconProps} />;
      case 'alert-triangle':
        return <AlertTriangle {...iconProps} />;
      case 'check-circle':
        return <CheckCircle {...iconProps} />;
      default:
        return <Wifi {...iconProps} />;
    }
  };

  const getStatusColor = () => {
    switch (statusColor) {
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2" data-testid="sync-status-compact">
        <Badge className={getStatusColor()}>
          <div className="flex items-center space-x-1">
            {getStatusIconComponent()}
            <span className="text-xs">{statusMessage}</span>
          </div>
        </Badge>
        
        {hasAnyPendingData && (
          <Badge variant="outline" className="text-xs">
            {syncStatus.pendingOperations} معلق
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card 
      className={`${needsAttention ? 'border-l-4 border-l-yellow-500' : ''}`}
      data-testid="sync-status-card"
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${statusColor === 'green' ? 'bg-green-100' : statusColor === 'yellow' ? 'bg-yellow-100' : 'bg-red-100'}`}>
              {getStatusIconComponent()}
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900" data-testid="text-sync-status">
                {statusMessage}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Signal className="h-3 w-3" />
                  <span>
                    {connectionStatus.connectionQuality === 'excellent' ? 'ممتاز' :
                     connectionStatus.connectionQuality === 'good' ? 'جيد' :
                     connectionStatus.connectionQuality === 'poor' ? 'ضعيف' : 'غير متصل'}
                  </span>
                </div>
                
                {lastSyncAge !== null && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>منذ {lastSyncAge} د</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showActions && canSync && (
            <Button
              onClick={triggerSync}
              size="sm"
              variant={hasAnyPendingData ? "default" : "outline"}
              disabled={syncStatus.isSyncing}
              data-testid="button-sync-trigger"
            >
              {syncStatus.isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  مزامنة...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 ml-2" />
                  مزامنة
                </>
              )}
            </Button>
          )}
        </div>

        {showDetails && (
          <>
            {/* Sync Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600" data-testid="text-pending-operations">
                  {syncStatus.pendingOperations}
                </div>
                <div className="text-xs text-gray-500">معلق</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600" data-testid="text-total-operations">
                  {syncStatus.totalOperations}
                </div>
                <div className="text-xs text-gray-500">مكتمل</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-red-600" data-testid="text-failed-operations">
                  {syncStatus.failedOperations}
                </div>
                <div className="text-xs text-gray-500">فاشل</div>
              </div>
            </div>

            {/* Progress Bar */}
            {syncStatus.isSyncing && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>تقدم المزامنة</span>
                  <span>{syncStatus.syncProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncStatus.syncProgress}%` }}
                    data-testid="sync-progress-bar"
                  />
                </div>
              </div>
            )}

            {/* Health Issues */}
            {healthCheck.issues.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">التنبيهات:</h4>
                <ul className="space-y-1">
                  {healthCheck.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-yellow-700 flex items-center space-x-2">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {healthCheck.recommendations.length > 0 && (
              <div className="border-t pt-3 mt-2">
                <h4 className="text-sm font-medium text-gray-900 mb-2">التوصيات:</h4>
                <ul className="space-y-1">
                  {healthCheck.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-700 flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Field Worker Specific Info */}
            {isFieldWorker && (
              <div className="border-t pt-3 mt-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-900">العمل الميداني:</span>
                  <span className="text-gray-600">
                    {connectionStatus.isOnline 
                      ? 'متصل - يمكن إرسال البيانات'
                      : 'غير متصل - سيتم الحفظ محلياً'
                    }
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SyncStatusIndicator;