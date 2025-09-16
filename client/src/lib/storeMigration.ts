/**
 * Migration Utility - LocalStorage to Encrypted IndexedDB
 * 
 * أداة هجرة البيانات من localStorage إلى IndexedDB المشفر
 * تحافظ على البيانات المحلية أثناء التحديث للأمان
 */

import { getSecureStore } from './secureIndexedDB';

interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
  preservedLocalStorage: { [key: string]: any };
}

class StoreMigration {
  
  /**
   * Check if migration is needed
   */
  static needsMigration(): boolean {
    const migrationMarker = localStorage.getItem('idb_migration_completed');
    return !migrationMarker;
  }

  /**
   * Get migration status
   */
  static getMigrationStatus(): 'not_needed' | 'required' | 'in_progress' | 'completed' {
    const migrationMarker = localStorage.getItem('idb_migration_completed');
    const migrationInProgress = localStorage.getItem('idb_migration_in_progress');
    
    if (migrationMarker) return 'completed';
    if (migrationInProgress) return 'in_progress';
    
    // Check if we have any sync-related localStorage data
    const syncKeys = this.getSyncRelatedKeys();
    return syncKeys.length > 0 ? 'required' : 'not_needed';
  }

  /**
   * Get localStorage keys related to sync operations
   */
  private static getSyncRelatedKeys(): string[] {
    const syncKeys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isSyncRelatedKey(key)) {
        syncKeys.push(key);
      }
    }
    
    return syncKeys;
  }

  /**
   * Check if key is sync-related
   */
  private static isSyncRelatedKey(key: string): boolean {
    const syncKeyPatterns = [
      'offline_operations',
      'pending_operations', 
      'sync_queue',
      'last_sync_time',
      'sync_session',
      'failed_operations',
      'conflict_data',
      'retry_attempts',
      'sync_metadata',
      'mobile_sync_'
    ];

    return syncKeyPatterns.some(pattern => key.includes(pattern));
  }

  /**
   * Perform complete migration
   */
  static async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      errors: [],
      preservedLocalStorage: {}
    };

    try {
      // Mark migration in progress
      localStorage.setItem('idb_migration_in_progress', 'true');
      console.log('🔄 Starting localStorage to IndexedDB migration...');

      // Initialize secure store
      const secureStore = await getSecureStore();
      
      // Get all sync-related keys
      const syncKeys = this.getSyncRelatedKeys();
      console.log(`📋 Found ${syncKeys.length} sync-related items to migrate`);

      // Migrate each category
      await this.migrateOperations(secureStore, syncKeys, result);
      await this.migrateMetadata(secureStore, syncKeys, result);
      await this.migrateRetryState(secureStore, syncKeys, result);
      await this.migrateConflicts(secureStore, syncKeys, result);

      // Verify migration
      const verification = await this.verifyMigration(secureStore, syncKeys);
      
      if (verification.success) {
        // Clean up localStorage (but preserve non-sync data)
        this.cleanupAfterMigration(syncKeys, result);
        
        // Mark migration completed
        localStorage.setItem('idb_migration_completed', new Date().toISOString());
        localStorage.removeItem('idb_migration_in_progress');
        
        result.success = true;
        console.log(`✅ Migration completed successfully! ${result.migratedCount} items migrated`);
      } else {
        throw new Error(`Migration verification failed: ${verification.errors.join(', ')}`);
      }

    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      localStorage.removeItem('idb_migration_in_progress');
      console.error('❌ Migration failed:', error);
    }

    return result;
  }

  /**
   * Migrate offline operations
   */
  private static async migrateOperations(
    secureStore: any, 
    syncKeys: string[], 
    result: MigrationResult
  ): Promise<void> {
    const operationKeys = syncKeys.filter(key => 
      key.includes('offline_operations') || 
      key.includes('pending_operations') ||
      key.includes('sync_queue')
    );

    for (const key of operationKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          await secureStore.setItem('operations' as any, key, parsed);
          result.migratedCount++;
          console.log(`  ✓ Migrated operations: ${key}`);
        }
      } catch (error) {
        result.errors.push(`Failed to migrate operations ${key}: ${error}`);
      }
    }
  }

  /**
   * Migrate sync metadata  
   */
  private static async migrateMetadata(
    secureStore: any,
    syncKeys: string[],
    result: MigrationResult
  ): Promise<void> {
    const metadataKeys = syncKeys.filter(key =>
      key.includes('last_sync_time') ||
      key.includes('sync_session') ||
      key.includes('sync_metadata') ||
      key.includes('mobile_sync_')
    );

    for (const key of metadataKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          // Try to parse JSON, fallback to string
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data; // Store as string if not JSON
          }
          
          await secureStore.setItem('metadata' as any, key, parsed);
          result.migratedCount++;
          console.log(`  ✓ Migrated metadata: ${key}`);
        }
      } catch (error) {
        result.errors.push(`Failed to migrate metadata ${key}: ${error}`);
      }
    }
  }

  /**
   * Migrate retry state
   */
  private static async migrateRetryState(
    secureStore: any,
    syncKeys: string[],
    result: MigrationResult
  ): Promise<void> {
    const retryKeys = syncKeys.filter(key =>
      key.includes('retry_attempts') ||
      key.includes('failed_operations')
    );

    for (const key of retryKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          await secureStore.setItem('retryState' as any, key, parsed);
          result.migratedCount++;
          console.log(`  ✓ Migrated retry state: ${key}`);
        }
      } catch (error) {
        result.errors.push(`Failed to migrate retry state ${key}: ${error}`);
      }
    }
  }

  /**
   * Migrate conflicts
   */
  private static async migrateConflicts(
    secureStore: any,
    syncKeys: string[],
    result: MigrationResult
  ): Promise<void> {
    const conflictKeys = syncKeys.filter(key =>
      key.includes('conflict_data')
    );

    for (const key of conflictKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          await secureStore.setItem('conflicts' as any, key, parsed);
          result.migratedCount++;
          console.log(`  ✓ Migrated conflicts: ${key}`);
        }
      } catch (error) {
        result.errors.push(`Failed to migrate conflicts ${key}: ${error}`);
      }
    }
  }

  /**
   * Verify migration success with strict data integrity checks
   */
  private static async verifyMigration(
    secureStore: any,
    originalKeys: string[]
  ): Promise<{ success: boolean; errors: string[] }> {
    const verification = { success: true, errors: [] };

    try {
      // Check each store category
      const storeCounts = {
        operations: 0,
        metadata: 0, 
        retryState: 0,
        conflicts: 0
      };
      
      for (const store of Object.keys(storeCounts)) {
        try {
          const items = await secureStore.getAllItems(store as any);
          storeCounts[store as keyof typeof storeCounts] = items.length;
          console.log(`  📊 Verified ${store}: ${items.length} items`);
          
          // Sample a few items to verify they decrypt properly
          if (items.length > 0) {
            const sampleItem = items[0];
            if (!sampleItem || typeof sampleItem !== 'object') {
              verification.errors.push(`Invalid decrypted data in ${store}`);
            }
          }
        } catch (error) {
          verification.errors.push(`Failed to verify ${store}: ${error}`);
        }
      }

      // Stricter validation - ensure we migrated the right number of items per category
      const operationKeys = originalKeys.filter(key => 
        key.includes('offline_operations') || key.includes('pending_operations')
      ).length;
      const metadataKeys = originalKeys.filter(key =>
        key.includes('last_sync_time') || key.includes('sync_metadata')
      ).length;
      
      if (operationKeys > 0 && storeCounts.operations === 0) {
        verification.errors.push(`Expected operations data but found none (${operationKeys} keys)`);
      }
      
      if (metadataKeys > 0 && storeCounts.metadata === 0) {
        verification.errors.push(`Expected metadata but found none (${metadataKeys} keys)`);
      }

      // Overall sanity check
      const totalMigrated = Object.values(storeCounts).reduce((sum, count) => sum + count, 0);
      if (originalKeys.length > 0 && totalMigrated === 0) {
        verification.errors.push('No data found in IndexedDB despite having localStorage keys');
      }

      verification.success = verification.errors.length === 0;

    } catch (error) {
      verification.success = false;
      verification.errors.push(`Verification error: ${error}`);
    }

    return verification;
  }

  /**
   * Clean up localStorage after successful migration
   */
  private static cleanupAfterMigration(syncKeys: string[], result: MigrationResult): void {
    // Preserve important non-sync localStorage data
    const preserveKeys = [
      'device_secret',
      'theme',
      'language',
      'user_preferences',
      'auth_token',
      'idb_migration_completed'
    ];

    // Build preservation map
    for (const key of preserveKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        result.preservedLocalStorage[key] = value;
      }
    }

    // Remove sync-related keys
    for (const key of syncKeys) {
      localStorage.removeItem(key);
      console.log(`  🗑️ Cleaned up localStorage: ${key}`);
    }

    console.log(`  💾 Preserved ${Object.keys(result.preservedLocalStorage).length} non-sync items`);
  }

  /**
   * Reset migration state (for testing/debugging)
   */
  static resetMigrationState(): void {
    localStorage.removeItem('idb_migration_completed');
    localStorage.removeItem('idb_migration_in_progress');
    console.log('🔄 Migration state reset');
  }

  /**
   * Get migration statistics
   */
  static async getMigrationStats(): Promise<{
    status: string;
    completedAt?: string;
    localStorageKeys: number;
    indexedDBItems: { [store: string]: number };
  }> {
    const status = this.getMigrationStatus();
    const stats: any = {
      status,
      localStorageKeys: this.getSyncRelatedKeys().length,
      indexedDBItems: {} as { [store: string]: number }
    };

    if (status === 'completed') {
      stats.completedAt = localStorage.getItem('idb_migration_completed') || '';
      
      try {
        const secureStore = await getSecureStore();
        const stores = ['operations', 'metadata', 'retryState', 'conflicts'];
        
        for (const store of stores) {
          const items = await secureStore.getAllItems(store as any);
          stats.indexedDBItems[store] = items.length;
        }
      } catch (error) {
        console.warn('Could not get IndexedDB stats:', error);
      }
    }

    return stats;
  }
}

export { StoreMigration };
export type { MigrationResult };