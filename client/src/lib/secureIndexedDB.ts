/**
 * Secure IndexedDB Store with WebCrypto AES-GCM Encryption
 * 
 * نظام تخزين آمن باستخدام IndexedDB مع تشفير AES-GCM
 * يحمي البيانات المحلية للعمليات الميدانية
 */

interface EncryptedData {
  encryptedData: ArrayBuffer;
  iv: ArrayBuffer;
  salt: ArrayBuffer;
  timestamp: number;
}

interface RetryState {
  id: string;
  attempts: number;
  lastAttempt: number;
  nextRetry: number;
  backoffMultiplier: number;
  deadLetter?: boolean;
}

interface SyncMetrics {
  operationsQueued: number;
  operationsPushed: number;
  operationsFailed: number;
  conflictsDetected: number;
  lastSyncTime?: number;
  totalSyncSessions: number;
}

class SecureIndexedDB {
  private dbName = 'YemenConstructionPlatform';
  private version = 1;
  private db: IDBDatabase | null = null;
  private encryptionKey: CryptoKey | null = null;
  private deviceSecret: string | null = null;
  
  // Store names
  private stores = {
    operations: 'offline_operations',
    entities: 'cached_entities', 
    metadata: 'sync_metadata',
    retryState: 'retry_state',
    conflicts: 'sync_conflicts',
    deadLetter: 'dead_letter_queue',
    metrics: 'sync_metrics'
  };

  /**
   * Initialize the secure store
   */
  async initialize(): Promise<void> {
    try {
      await this.initializeDeviceSecret();
      await this.openDatabase();
      await this.generateEncryptionKey();
      
      console.log('🔐 SecureIndexedDB initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SecureIndexedDB:', error);
      throw error;
    }
  }

  /**
   * Generate or retrieve device secret with improved security
   */
  private async initializeDeviceSecret(): Promise<void> {
    // Try to get existing secret from localStorage (migration compatibility)
    this.deviceSecret = localStorage.getItem('device_secret');
    
    if (!this.deviceSecret) {
      // Generate new device secret (stronger entropy)
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      this.deviceSecret = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('device_secret', this.deviceSecret);
      
      // TODO: Migrate to more secure storage (wrapped in IndexedDB) after initial setup
      console.warn('🔐 Device secret in localStorage - consider migration to secure store');
    }
  }

  /**
   * Open IndexedDB connection
   */
  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains(this.stores.operations)) {
          const operationsStore = db.createObjectStore(this.stores.operations, { keyPath: 'id' });
          operationsStore.createIndex('tableIndex', 'tableName');
          operationsStore.createIndex('timestampIndex', 'timestamp');
        }
        
        if (!db.objectStoreNames.contains(this.stores.entities)) {
          const entitiesStore = db.createObjectStore(this.stores.entities, { keyPath: 'key' });
          entitiesStore.createIndex('tableIndex', 'tableName');
          entitiesStore.createIndex('lastModifiedIndex', 'lastModified');
        }
        
        if (!db.objectStoreNames.contains(this.stores.metadata)) {
          db.createObjectStore(this.stores.metadata, { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains(this.stores.retryState)) {
          const retryStore = db.createObjectStore(this.stores.retryState, { keyPath: 'id' });
          retryStore.createIndex('nextRetryIndex', 'nextRetry');
        }
        
        if (!db.objectStoreNames.contains(this.stores.conflicts)) {
          const conflictsStore = db.createObjectStore(this.stores.conflicts, { keyPath: 'id' });
          conflictsStore.createIndex('sessionIndex', 'sessionId');
        }
        
        if (!db.objectStoreNames.contains(this.stores.deadLetter)) {
          db.createObjectStore(this.stores.deadLetter, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(this.stores.metrics)) {
          db.createObjectStore(this.stores.metrics, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Generate encryption key using PBKDF2
   */
  private async generateEncryptionKey(): Promise<void> {
    if (!this.deviceSecret) {
      throw new Error('Device secret not initialized');
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.deviceSecret),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Generate or retrieve per-device salt for stronger security
    let saltHex = localStorage.getItem('device_salt');
    if (!saltHex) {
      const saltArray = new Uint8Array(16);
      crypto.getRandomValues(saltArray);
      saltHex = Array.from(saltArray, b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('device_salt', saltHex);
    }
    
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using AES-GCM
   */
  private async encrypt(data: any): Promise<EncryptedData> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not generated');
    }

    const encoder = new TextEncoder();
    const jsonData = JSON.stringify(data);
    const plaintext = encoder.encode(jsonData);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.encryptionKey,
      plaintext
    );

    return {
      encryptedData,
      iv: iv.buffer,
      salt: salt.buffer,
      timestamp: Date.now()
    };
  }

  /**
   * Decrypt data using AES-GCM
   */
  private async decrypt(encryptedData: EncryptedData): Promise<any> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not generated');
    }

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encryptedData.iv },
      this.encryptionKey,
      encryptedData.encryptedData
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  }

  /**
   * Store encrypted data - handles different keyPath schemas
   */
  async setItem(storeName: keyof typeof this.stores, key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const encryptedData = await this.encrypt(value);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores[storeName]], 'readwrite');
      const store = transaction.objectStore(this.stores[storeName]);
      
      // Create proper object based on store's keyPath
      let storeObject: any;
      
      if (storeName === 'operations' || storeName === 'retryState' || 
          storeName === 'conflicts' || storeName === 'deadLetter') {
        // These stores use keyPath 'id'
        storeObject = {
          id: key,
          ...encryptedData
        };
      } else {
        // metadata, entities, metrics use keyPath 'key'  
        storeObject = {
          key,
          ...encryptedData
        };
      }
      
      const request = store.put(storeObject);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve and decrypt data - handles different keyPath schemas  
   */
  async getItem(storeName: keyof typeof this.stores, key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores[storeName]], 'readonly');
      const store = transaction.objectStore(this.stores[storeName]);
      
      const request = store.get(key);
      
      request.onsuccess = async () => {
        if (request.result) {
          try {
            // Extract encrypted data (skip the key/id field)
            const { key: _key, id: _id, ...encryptedData } = request.result;
            const decrypted = await this.decrypt(encryptedData);
            resolve(decrypted);
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove item
   */
  async removeItem(storeName: keyof typeof this.stores, key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores[storeName]], 'readwrite');
      const store = transaction.objectStore(this.stores[storeName]);
      
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all items from a store
   */
  async getAllItems(storeName: keyof typeof this.stores): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores[storeName]], 'readonly');
      const store = transaction.objectStore(this.stores[storeName]);
      
      const request = store.getAll();
      
      request.onsuccess = async () => {
        try {
          const decryptedItems = await Promise.all(
            request.result.map(item => {
              // Extract encrypted data (skip the key/id field)
              const { key: _key, id: _id, ...encryptedData } = item;
              return this.decrypt(encryptedData);
            })
          );
          resolve(decryptedItems);
        } catch (error) {
          reject(error);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data from a store
   */
  async clearStore(storeName: keyof typeof this.stores): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores[storeName]], 'readwrite');
      const store = transaction.objectStore(this.stores[storeName]);
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Batch operations for better performance
   */
  async batchSet(storeName: keyof typeof this.stores, items: { key: string, value: any }[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([this.stores[storeName]], 'readwrite');
    const store = transaction.objectStore(this.stores[storeName]);
    
    const promises = items.map(async ({ key, value }) => {
      const encryptedData = await this.encrypt(value);
      return new Promise<void>((resolve, reject) => {
        const request = store.put({
          key,
          ...encryptedData
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  /**
   * Store retry state
   */
  async setRetryState(operationId: string, retryState: RetryState): Promise<void> {
    await this.setItem('retryState', operationId, retryState);
  }

  /**
   * Get retry state
   */
  async getRetryState(operationId: string): Promise<RetryState | null> {
    return this.getItem('retryState', operationId);
  }

  /**
   * Update sync metrics
   */
  async updateMetrics(metrics: Partial<SyncMetrics>): Promise<void> {
    const current = await this.getItem('metrics', 'current') || {
      operationsQueued: 0,
      operationsPushed: 0,
      operationsFailed: 0,
      conflictsDetected: 0,
      totalSyncSessions: 0
    };

    const updated = { ...current, ...metrics };
    await this.setItem('metrics', 'current', updated);
  }

  /**
   * Get sync metrics
   */
  async getMetrics(): Promise<SyncMetrics> {
    return this.getItem('metrics', 'current') || {
      operationsQueued: 0,
      operationsPushed: 0,
      operationsFailed: 0,
      conflictsDetected: 0,
      totalSyncSessions: 0
    };
  }
}

// Singleton instance
let secureStore: SecureIndexedDB | null = null;

export const getSecureStore = async (): Promise<SecureIndexedDB> => {
  if (!secureStore) {
    secureStore = new SecureIndexedDB();
    await secureStore.initialize();
  }
  return secureStore;
};

export type { RetryState, SyncMetrics, EncryptedData };
export { SecureIndexedDB };