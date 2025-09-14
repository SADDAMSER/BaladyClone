import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/auth/useAuth';
import { useLBACFilter } from '@/hooks/useLBACFilter';
import { useToast } from '@/hooks/use-toast';

export interface SyncOperation {
  id?: string; // Generated locally for tracking
  operation: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string;
  data: any;
  timestamp: string;
  userId: string;
  deviceId?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

interface SyncError {
  type: 'network' | 'server' | 'validation' | 'auth' | 'unknown';
  message: string;
  originalError?: Error;
  retryable: boolean;
}

export interface SyncSession {
  id: string;
  userId: string;
  deviceId: string;
  startTime: string;
  endTime?: string;
  operationsCount: number;
  status: 'active' | 'completed' | 'failed';
  lastSyncTime?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: string;
  pendingOperations: number;
  failedOperations: number;
  totalOperations: number;
  syncProgress: number; // 0-100
}

export interface SyncTableInfo {
  tableName: string;
  allowedOperations: string[];
  lastSyncTime?: string;
  recordCount: number;
  hasConflicts: boolean;
}

/**
 * Mobile Sync Hook - manages data synchronization between field operations and dashboard
 * إدارة مزامنة البيانات بين العمليات الميدانية ولوحة التحكم
 */
export function useMobileSync() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const { getAllowedGeographicIds, hasAnyGeographicAccess } = useLBACFilter();
  const { toast } = useToast();

  // Retry configuration
  const retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  };
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingOperations: 0,
    failedOperations: 0,
    totalOperations: 0,
    syncProgress: 0
  });

  // Retry state
  const [retryAttempts, setRetryAttempts] = useState<Map<string, number>>(new Map());

  // Error classification helper
  const classifyError = useCallback((error: any): SyncError => {
    const errorString = error?.message || error?.toString() || 'خطأ غير معروف';
    
    if (!navigator.onLine) {
      return {
        type: 'network',
        message: 'لا يوجد اتصال بالإنترنت',
        originalError: error,
        retryable: true
      };
    }

    if (error?.status === 401 || error?.status === 403) {
      return {
        type: 'auth',
        message: 'خطأ في التحقق من الهوية أو الصلاحيات',
        originalError: error,
        retryable: false
      };
    }

    if (error?.status >= 500) {
      return {
        type: 'server',
        message: 'خطأ في الخادم - يرجى المحاولة لاحقاً',
        originalError: error,
        retryable: true
      };
    }

    if (error?.status >= 400 && error?.status < 500) {
      return {
        type: 'validation',
        message: 'خطأ في البيانات المرسلة',
        originalError: error,
        retryable: false
      };
    }

    if (errorString.includes('network') || errorString.includes('fetch')) {
      return {
        type: 'network',
        message: 'خطأ في الشبكة - تحقق من الاتصال',
        originalError: error,
        retryable: true
      };
    }

    return {
      type: 'unknown',
      message: `خطأ غير متوقع: ${errorString}`,
      originalError: error,
      retryable: true
    };
  }, []);

  // Retry with exponential backoff
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> => {
    const config = { ...retryConfig, ...customConfig };
    const currentAttempts = retryAttempts.get(operationName) || 0;

    try {
      const result = await operation();
      
      // Reset retry count on success
      if (currentAttempts > 0) {
        setRetryAttempts(prev => {
          const newMap = new Map(prev);
          newMap.delete(operationName);
          return newMap;
        });
      }

      return result;
    } catch (error) {
      const syncError = classifyError(error);
      
      if (!syncError.retryable || currentAttempts >= config.maxRetries) {
        // Show error toast for final failure
        toast({
          title: "فشل في المزامنة",
          description: syncError.message,
          variant: "destructive",
        });
        
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, currentAttempts),
        config.maxDelay
      );

      // Update retry count
      setRetryAttempts(prev => {
        const newMap = new Map(prev);
        newMap.set(operationName, currentAttempts + 1);
        return newMap;
      });

      // Show retry toast
      toast({
        title: `محاولة ${currentAttempts + 1} من ${config.maxRetries}`,
        description: `إعادة المحاولة خلال ${Math.round(delay / 1000)} ثانية...`,
        variant: "default",
      });

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Recursive retry
      return executeWithRetry(operation, operationName, customConfig);
    }
  }, [retryAttempts, retryConfig, classifyError, toast]);

  const [deviceId] = useState(() => {
    // Generate or retrieve device ID from localStorage
    let device = localStorage.getItem('device_id');
    if (!device) {
      device = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', device);
    }
    return device;
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      // Auto-sync when coming back online
      if (user && token) {
        triggerSync();
      }
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, token]);

  // Get sync session info
  const { data: syncSession, refetch: refetchSession } = useQuery({
    queryKey: ['/api/sync/session', deviceId],
    enabled: !!user && !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get syncable tables info
  const { data: syncTables = [] } = useQuery<SyncTableInfo[]>({
    queryKey: ['/api/sync/tables'],
    enabled: !!user && !!token,
  });

  // Pull data from server (download changes)
  const pullMutation = useMutation({
    mutationFn: async ({ 
      lastSyncTime, 
      tableFilters 
    }: { 
      lastSyncTime?: string; 
      tableFilters?: Record<string, any> 
    }) => {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, syncProgress: 10 }));
      
      // Apply LBAC filtering to sync operations
      const userScope = getAllowedGeographicIds();
      const lbacFilters = userScope ? {
        geographicScope: userScope,
        ...tableFilters
      } : tableFilters;
      
      const response = await apiRequest('/api/sync/pull', 'POST', {
        deviceId,
        lastSyncTime,
        tableFilters: lbacFilters,
        includeConflicts: true
      });

      const data = await response.json();
      setSyncStatus(prev => ({ ...prev, syncProgress: 50 }));
      return data;
    },
    onSuccess: (data) => {
      // Update local cache with synced data
      if (data.changes) {
        Object.entries(data.changes).forEach(([tableName, records]) => {
          queryClient.setQueryData([`/api/${tableName}`], records);
          queryClient.invalidateQueries({ queryKey: [`/api/${tableName}`] });
        });
      }

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
        syncProgress: 100,
        pendingOperations: data.pendingOperations || 0,
        failedOperations: data.failedOperations || 0
      }));

      // Store sync timestamp
      localStorage.setItem('last_sync_time', new Date().toISOString());
      refetchSession();

      // Success toast
      if (data.changeCount > 0) {
        toast({
          title: "تمت المزامنة بنجاح",
          description: `تم تحديث ${data.changeCount} عنصر`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      console.error('Pull sync failed:', error);
      const syncError = classifyError(error);
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: 0,
        failedOperations: prev.failedOperations + 1
      }));

      // Don't show toast here - executeWithRetry handles it
      if (!syncError.retryable) {
        toast({
          title: "فشل في سحب البيانات",
          description: syncError.message,
          variant: "destructive",
        });
      }
    }
  });

  // Push data to server (upload local changes)
  const pushMutation = useMutation({
    mutationFn: async (operations: SyncOperation[]) => {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, syncProgress: 20 }));

      const response = await apiRequest('/api/sync/push', 'POST', {
        deviceId,
        operations,
        conflictResolution: 'server_wins' // Default conflict resolution
      });

      const data = await response.json();
      setSyncStatus(prev => ({ ...prev, syncProgress: 80 }));
      return data;
    },
    onSuccess: (data) => {
      // Clear successfully synced operations from local storage
      if (data.processedOperations) {
        // Use the local operation IDs for proper clearing
        const processedLocalIds = data.processedOperations.map((op: any) => op.localId || op.id);
        clearLocalOperations(processedLocalIds);
      }

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
        syncProgress: 100,
        totalOperations: prev.totalOperations + (data.processedOperations?.length || 0)
      }));

      // Invalidate affected queries
      if (data.affectedTables) {
        data.affectedTables.forEach((tableName: string) => {
          queryClient.invalidateQueries({ queryKey: [`/api/${tableName}`] });
        });
      }

      refetchSession();

      // Success toast for push
      if (data.processedOperations?.length > 0) {
        toast({
          title: "تم رفع البيانات بنجاح",
          description: `تم رفع ${data.processedOperations.length} عملية`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      console.error('Push sync failed:', error);
      const syncError = classifyError(error);
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: 0,
        failedOperations: prev.failedOperations + 1
      }));

      // Handle push errors gracefully
      if (!syncError.retryable) {
        toast({
          title: "فشل في رفع البيانات",
          description: `${syncError.message}. البيانات محفوظة محلياً وسيتم المحاولة لاحقاً`,
          variant: "destructive",
        });
      }
    }
  });

  // Get pending local operations
  const getPendingOperations = useCallback((): SyncOperation[] => {
    const pending = localStorage.getItem('pending_sync_operations');
    return pending ? JSON.parse(pending) : [];
  }, []);

  // Store operation locally for later sync
  const storeLocalOperation = useCallback((operation: Omit<SyncOperation, 'id' | 'timestamp' | 'userId'>) => {
    if (!user) return;

    const fullOperation: SyncOperation = {
      ...operation,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique local ID
      timestamp: new Date().toISOString(),
      userId: user.id,
      deviceId
    };

    const pending = getPendingOperations();
    const updated = [...pending, fullOperation];
    localStorage.setItem('pending_sync_operations', JSON.stringify(updated));

    setSyncStatus(prev => ({
      ...prev,
      pendingOperations: updated.length
    }));
  }, [user, deviceId, getPendingOperations]);

  // Clear processed operations from local storage
  const clearLocalOperations = useCallback((operationIds: string[]) => {
    const pending = getPendingOperations();
    const filtered = pending.filter(op => !operationIds.includes(op.id!));
    localStorage.setItem('pending_sync_operations', JSON.stringify(filtered));

    setSyncStatus(prev => ({
      ...prev,
      pendingOperations: filtered.length
    }));
  }, [getPendingOperations]);

  // Trigger full sync (pull then push)
  const triggerSync = useCallback(async () => {
    if (!user || !syncStatus.isOnline || syncStatus.isSyncing) return;
    
    // Check if user has geographic access before attempting sync
    if (!hasAnyGeographicAccess()) {
      console.warn('Sync blocked: User has no geographic access permissions');
      return;
    }

    try {
      const lastSyncTime = localStorage.getItem('last_sync_time');
      
      // Pull latest changes first with LBAC filtering
      await pullMutation.mutateAsync({ lastSyncTime: lastSyncTime || undefined });

      // Push local changes
      const pendingOps = getPendingOperations();
      if (pendingOps.length > 0) {
        await pushMutation.mutateAsync(pendingOps);
      }
    } catch (error) {
      console.error('Full sync failed:', error);
    }
  }, [user, syncStatus.isOnline, syncStatus.isSyncing, pullMutation, pushMutation, getPendingOperations, hasAnyGeographicAccess]);

  // Auto-sync on interval when online
  useEffect(() => {
    if (!user || !syncStatus.isOnline) return;

    const interval = setInterval(() => {
      triggerSync();
    }, 5 * 60 * 1000); // Auto-sync every 5 minutes

    return () => clearInterval(interval);
  }, [user, syncStatus.isOnline, triggerSync]);

  // Initialize sync status from localStorage
  useEffect(() => {
    const pending = getPendingOperations();
    const lastSync = localStorage.getItem('last_sync_time');
    
    setSyncStatus(prev => ({
      ...prev,
      pendingOperations: pending.length,
      lastSyncTime: lastSync || undefined
    }));
  }, [getPendingOperations]);

  const syncInfo = useMemo(() => ({
    canSync: !!user && syncStatus.isOnline && !syncStatus.isSyncing,
    isFieldWorker: user?.role === 'engineer' || user?.role === 'surveyor',
    hasAnyPendingData: syncStatus.pendingOperations > 0,
    lastSyncAge: syncStatus.lastSyncTime 
      ? Math.round((Date.now() - new Date(syncStatus.lastSyncTime).getTime()) / 1000 / 60) 
      : null, // minutes ago
  }), [user, syncStatus]);

  return {
    // Status information
    syncStatus,
    syncSession,
    syncTables,
    syncInfo,
    deviceId,

    // Core sync operations
    triggerSync,
    pullChanges: pullMutation.mutateAsync,
    pushChanges: pushMutation.mutateAsync,

    // Local operation management
    storeLocalOperation,
    getPendingOperations,
    clearLocalOperations,

    // Mutation states
    isPulling: pullMutation.isPending,
    isPushing: pushMutation.isPending,
    pullError: pullMutation.error,
    pushError: pushMutation.error,

    // Utilities
    canSync: syncInfo.canSync,
    isFieldWorker: syncInfo.isFieldWorker,
    hasAnyPendingData: syncInfo.hasAnyPendingData,
    lastSyncAge: syncInfo.lastSyncAge
  };
}

export default useMobileSync;