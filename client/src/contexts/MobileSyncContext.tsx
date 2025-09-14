import React, { createContext, useContext, ReactNode } from 'react';
import { useMobileSync } from '@/hooks/useMobileSync';

type MobileSyncContextType = ReturnType<typeof useMobileSync>;

const MobileSyncContext = createContext<MobileSyncContextType | null>(null);

interface MobileSyncProviderProps {
  children: ReactNode;
}

/**
 * Centralized Mobile Sync Provider - Prevents duplicate listeners and sync storms
 * مزود مزامنة محمولة مركزي - يمنع المستمعين المكررين وعواصف المزامنة
 */
export function MobileSyncProvider({ children }: MobileSyncProviderProps) {
  // Single instance of useMobileSync to prevent duplicate listeners
  const syncValue = useMobileSync();

  return (
    <MobileSyncContext.Provider value={syncValue}>
      {children}
    </MobileSyncContext.Provider>
  );
}

/**
 * Hook to consume Mobile Sync context - replaces direct useMobileSync usage
 * خطاف لاستهلاك سياق المزامنة المحمولة - يحل محل الاستخدام المباشر لـ useMobileSync
 */
export function useMobileSyncContext(): MobileSyncContextType {
  const context = useContext(MobileSyncContext);
  
  if (!context) {
    throw new Error('useMobileSyncContext must be used within a MobileSyncProvider');
  }
  
  return context;
}

/**
 * Lightweight hook for components that only need basic sync data
 * خطاف خفيف للمكونات التي تحتاج فقط لبيانات مزامنة أساسية
 */
export function useSyncStatusBasic() {
  const { syncStatus, syncInfo, lastSyncAge, hasAnyPendingData } = useMobileSyncContext();
  
  return {
    syncStatus,
    syncInfo,
    lastSyncAge,
    hasAnyPendingData,
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    canSync: syncInfo.canSync,
    isFieldWorker: syncInfo.isFieldWorker
  };
}

/**
 * Lightweight hook for components that only need sync actions
 * خطاف خفيف للمكونات التي تحتاج فقط لإجراءات المزامنة
 */
export function useSyncActions() {
  const { 
    triggerSync, 
    pullChanges, 
    pushChanges, 
    storeLocalOperation,
    clearLocalOperations
  } = useMobileSyncContext();
  
  return {
    triggerSync,
    pullChanges,
    pushChanges,
    storeLocalOperation,
    clearLocalOperations
  };
}

export default MobileSyncProvider;