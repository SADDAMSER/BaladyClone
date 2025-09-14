import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Upload, 
  Download, 
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useMobileSyncContext } from '@/contexts/MobileSyncContext';
import { useSyncStatus } from '@/hooks/useSyncStatus';

interface SyncButtonProps {
  variant?: 'full' | 'pull' | 'push';
  size?: 'sm' | 'default' | 'lg';
  showStatus?: boolean;
  className?: string;
}

export function SyncButton({ 
  variant = 'full', 
  size = 'default',
  showStatus = true,
  className = ''
}: SyncButtonProps) {
  const {
    triggerSync,
    pullChanges,
    pushChanges,
    getPendingOperations,
    canSync,
    hasAnyPendingData,
    isPulling,
    isPushing,
    syncStatus
  } = useMobileSyncContext();

  const {
    connectionStatus,
    statusColor,
    needsAttention
  } = useSyncStatus();

  const [lastAction, setLastAction] = useState<'pull' | 'push' | 'full' | null>(null);

  const handleFullSync = async () => {
    setLastAction('full');
    await triggerSync();
    setLastAction(null);
  };

  const handlePullOnly = async () => {
    setLastAction('pull');
    try {
      const lastSyncTime = localStorage.getItem('last_sync_time');
      await pullChanges({ lastSyncTime: lastSyncTime || undefined });
    } catch (error) {
      console.error('Pull failed:', error);
    }
    setLastAction(null);
  };

  const handlePushOnly = async () => {
    setLastAction('push');
    try {
      const pendingOps = getPendingOperations();
      if (pendingOps.length > 0) {
        await pushChanges(pendingOps);
      }
    } catch (error) {
      console.error('Push failed:', error);
    }
    setLastAction(null);
  };

  const isAnyLoading = isPulling || isPushing || syncStatus.isSyncing;
  const currentAction = lastAction || (isPulling ? 'pull' : isPushing ? 'push' : 'full');

  if (variant === 'pull') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button
          onClick={handlePullOnly}
          size={size}
          variant="outline"
          disabled={!canSync || isAnyLoading}
          data-testid="button-sync-pull"
        >
          {isPulling ? (
            <>
              <Download className="h-4 w-4 ml-2 animate-pulse" />
              تحميل...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 ml-2" />
              تحميل البيانات
            </>
          )}
        </Button>
        
        {showStatus && !connectionStatus.isOnline && (
          <Badge variant="outline" className="text-red-600">
            <WifiOff className="h-3 w-3 ml-1" />
            غير متصل
          </Badge>
        )}
      </div>
    );
  }

  if (variant === 'push') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button
          onClick={handlePushOnly}
          size={size}
          variant={hasAnyPendingData ? "default" : "outline"}
          disabled={!canSync || !hasAnyPendingData || isAnyLoading}
          data-testid="button-sync-push"
        >
          {isPushing ? (
            <>
              <Upload className="h-4 w-4 ml-2 animate-pulse" />
              إرسال...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 ml-2" />
              إرسال البيانات
            </>
          )}
        </Button>
        
        {showStatus && hasAnyPendingData && (
          <Badge variant="default" data-testid="badge-pending-count">
            {syncStatus.pendingOperations} معلق
          </Badge>
        )}
      </div>
    );
  }

  // Full sync variant (default)
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Button
        onClick={handleFullSync}
        size={size}
        variant={needsAttention || hasAnyPendingData ? "default" : "outline"}
        disabled={!canSync || isAnyLoading}
        data-testid="button-sync-full"
        className={needsAttention ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
      >
        {isAnyLoading ? (
          <>
            <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
            {currentAction === 'pull' ? 'تحميل...' : 
             currentAction === 'push' ? 'إرسال...' : 'مزامنة...'}
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 ml-2" />
            مزامنة كاملة
          </>
        )}
      </Button>

      {showStatus && (
        <div className="flex items-center space-x-2">
          {!connectionStatus.isOnline ? (
            <Badge variant="outline" className="text-red-600">
              <WifiOff className="h-3 w-3 ml-1" />
              غير متصل
            </Badge>
          ) : syncStatus.failedOperations > 0 ? (
            <Badge variant="outline" className="text-red-600">
              <AlertCircle className="h-3 w-3 ml-1" />
              {syncStatus.failedOperations} فاشل
            </Badge>
          ) : hasAnyPendingData ? (
            <Badge variant="default" data-testid="badge-pending-operations">
              {syncStatus.pendingOperations} معلق
            </Badge>
          ) : syncStatus.lastSyncTime ? (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 ml-1" />
              محدث
            </Badge>
          ) : null}

          {connectionStatus.isOnline && (
            <Badge variant="outline" className="text-green-600">
              <Wifi className="h-3 w-3 ml-1" />
              متصل
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default SyncButton;