'use client';

import { showSuccess, showWarning, showError } from '@/components/notification-system';

// Types for offline data management
interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  isSyncing: boolean;
  syncProgress: number;
}

class OfflineManager {
  private dbName = 'pos-offline-store';
  private version = 1;
  private db: IDBDatabase | null = null;
  private syncQueue: OfflineOperation[] = [];
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSync: null,
    pendingOperations: 0,
    isSyncing: false,
    syncProgress: 0,
  };
  private listeners: Array<(status: SyncStatus) => void> = [];

  constructor() {
    this.initializeDB();
    this.setupEventListeners();
    this.loadPendingOperations();
  }

  // Initialize IndexedDB
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('name', 'productName', { unique: false });
          productStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('operations')) {
          const operationStore = db.createObjectStore('operations', { keyPath: 'id' });
          operationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Setup network and sync event listeners
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      this.notifyListeners();
      this.syncPendingOperations();
      showSuccess('กลับมาออนไลน์แล้ว', 'กำลังซิงค์ข้อมูล...');
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
      this.notifyListeners();
      showWarning('ขาดการเชื่อมต่อ', 'ระบบจะเก็บข้อมูลไว้ใน Cache');
    });

    // Periodic sync check
    setInterval(() => {
      if (this.syncStatus.isOnline && this.syncQueue.length > 0 && !this.syncStatus.isSyncing) {
        this.syncPendingOperations();
      }
    }, 30000); // Check every 30 seconds
  }

  // Load pending operations from IndexedDB
  private async loadPendingOperations(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['operations'], 'readonly');
    const store = transaction.objectStore('operations');
    const request = store.getAll();

    request.onsuccess = () => {
      this.syncQueue = request.result;
      this.syncStatus.pendingOperations = this.syncQueue.length;
      this.notifyListeners();
    };
  }

  // Add operation to sync queue
  public async addOperation(
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    table: string,
    data: any
  ): Promise<void> {
    const operation: OfflineOperation = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    };

    // Add to memory queue
    this.syncQueue.push(operation);

    // Persist to IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      await store.add(operation);
    }

    this.syncStatus.pendingOperations = this.syncQueue.length;
    this.notifyListeners();

    // Try immediate sync if online
    if (this.syncStatus.isOnline) {
      this.syncPendingOperations();
    } else {
      showWarning('ข้อมูลถูกเก็บไว้', 'จะอัพโหลดเมื่อกลับมาออนไลน์');
    }
  }

  // Sync pending operations with server
  private async syncPendingOperations(): Promise<void> {
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.syncStatus.isSyncing = true;
    this.syncStatus.syncProgress = 0;
    this.notifyListeners();

    const totalOperations = this.syncQueue.length;
    let completedOperations = 0;

    try {
      for (let i = 0; i < this.syncQueue.length; i++) {
        const operation = this.syncQueue[i];
        
        try {
          await this.performServerSync(operation);
          
          // Remove successful operation
          this.syncQueue.splice(i, 1);
          i--; // Adjust index after removal
          
          // Remove from IndexedDB
          if (this.db) {
            const transaction = this.db.transaction(['operations'], 'readwrite');
            const store = transaction.objectStore('operations');
            await store.delete(operation.id);
          }
          
          completedOperations++;
          this.syncStatus.syncProgress = (completedOperations / totalOperations) * 100;
          this.notifyListeners();
          
        } catch (error) {
          console.error('Sync operation failed:', error);
          operation.retryCount++;
          
          if (operation.retryCount >= operation.maxRetries) {
            // Remove failed operation after max retries
            this.syncQueue.splice(i, 1);
            i--;
            
            if (this.db) {
              const transaction = this.db.transaction(['operations'], 'readwrite');
              const store = transaction.objectStore('operations');
              await store.delete(operation.id);
            }
            
            showError(`ไม่สามารถซิงค์ข้อมูลได้`, `การดำเนินการ ${operation.type} ล้มเหลว`);
          }
        }
      }

      this.syncStatus.lastSync = new Date();
      this.syncStatus.pendingOperations = this.syncQueue.length;
      
      if (completedOperations > 0) {
        showSuccess(`ซิงค์เสร็จสิ้น`, `อัพโหลดข้อมูล ${completedOperations} รายการ`);
      }
      
    } catch (error) {
      console.error('Sync process failed:', error);
      showError('ซิงค์ล้มเหลว', 'จะลองใหม่ในภายหลัง');
    } finally {
      this.syncStatus.isSyncing = false;
      this.syncStatus.syncProgress = 100;
      this.notifyListeners();
      
      setTimeout(() => {
        this.syncStatus.syncProgress = 0;
        this.notifyListeners();
      }, 2000);
    }
  }

  // Perform actual server sync
  private async performServerSync(operation: OfflineOperation): Promise<void> {
    let url = '';
    let method = '';
    let body: any = undefined;

    switch (operation.type) {
      case 'CREATE':
        url = `/api/${operation.table}`;
        method = 'POST';
        body = JSON.stringify(operation.data);
        break;
      case 'UPDATE':
        url = `/api/${operation.table}/${operation.data.id}`;
        method = 'PUT';
        body = JSON.stringify(operation.data);
        break;
      case 'DELETE':
        url = `/api/${operation.table}/${operation.data.id}`;
        method = 'DELETE';
        break;
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    return response.json();
  }

  // Store data locally for offline access
  public async storeOfflineData(table: string, data: any): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([table], 'readwrite');
    const store = transaction.objectStore(table);
    
    if (Array.isArray(data)) {
      for (const item of data) {
        await store.put(item);
      }
    } else {
      await store.put(data);
    }
  }

  // Get offline data
  public async getOfflineData(table: string, id?: string): Promise<any> {
    if (!this.db) return null;

    const transaction = this.db.transaction([table], 'readonly');
    const store = transaction.objectStore(table);

    if (id) {
      const request = store.get(id);
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
      });
    } else {
      const request = store.getAll();
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
      });
    }
  }

  // Subscribe to sync status changes
  public onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback({ ...this.syncStatus }));
  }

  // Get current sync status
  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Force sync
  public async forcSync(): Promise<void> {
    if (this.syncStatus.isOnline) {
      await this.syncPendingOperations();
    } else {
      showWarning('ไม่มีการเชื่อมต่อ', 'ไม่สามารถซิงค์ได้ในขณะนี้');
    }
  }

  // Clear all offline data
  public async clearOfflineData(): Promise<void> {
    if (!this.db) return;

    const tables = ['products', 'operations'];
    for (const table of tables) {
      const transaction = this.db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      await store.clear();
    }

    this.syncQueue = [];
    this.syncStatus.pendingOperations = 0;
    this.notifyListeners();
    
    showSuccess('ล้างข้อมูล Cache สำเร็จ');
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

// React hook for using offline manager
import React from 'react';

export function useOfflineManager() {
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>(
    offlineManager.getSyncStatus()
  );

  React.useEffect(() => {
    const unsubscribe = offlineManager.onStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  return {
    syncStatus,
    addOperation: offlineManager.addOperation.bind(offlineManager),
    getOfflineData: offlineManager.getOfflineData.bind(offlineManager),
    storeOfflineData: offlineManager.storeOfflineData.bind(offlineManager),
    forceSync: offlineManager.forcSync.bind(offlineManager),
    clearOfflineData: offlineManager.clearOfflineData.bind(offlineManager),
  };
}