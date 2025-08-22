'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface RealtimeConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  throttleMs?: number;
  batchUpdates?: boolean;
  maxBatchSize?: number;
}

interface RealtimeState<T> {
  data: T[];
  isConnected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

// Optimized real-time hook for POS systems
export function useOptimizedRealtime<T>(
  initialData: T[],
  config: RealtimeConfig
): RealtimeState<T> & {
  refetch: () => void;
  manualUpdate: (newData: T[]) => void;
} {
  const [state, setState] = useState<RealtimeState<T>>({
    data: initialData,
    isConnected: false,
    lastUpdate: null,
    error: null,
  });

  const subscriptionRef = useRef<any>(null);
  const batchQueueRef = useRef<any[]>([]);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionRetryRef = useRef<number>(0);
  const maxRetries = 5;

  // Throttled update function to prevent UI flooding
  const throttledUpdate = useCallback((updates: any[]) => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    throttleTimeoutRef.current = setTimeout(() => {
      setState(prev => {
        const newData = [...prev.data];
        
        // Process batch updates efficiently
        updates.forEach(update => {
          const { eventType, new: newRecord, old: oldRecord } = update;
          
          switch (eventType) {
            case 'INSERT':
              // Add new record at the beginning for latest-first ordering
              newData.unshift(newRecord);
              break;
              
            case 'UPDATE':
              const updateIndex = newData.findIndex((item: any) => item.id === newRecord.id);
              if (updateIndex !== -1) {
                newData[updateIndex] = newRecord;
              }
              break;
              
            case 'DELETE':
              const deleteIndex = newData.findIndex((item: any) => item.id === oldRecord.id);
              if (deleteIndex !== -1) {
                newData.splice(deleteIndex, 1);
              }
              break;
          }
        });

        return {
          ...prev,
          data: newData,
          lastUpdate: new Date(),
          error: null,
        };
      });
      
      // Clear the batch queue
      batchQueueRef.current = [];
    }, config.throttleMs || 500);
  }, [config.throttleMs]);

  // Handle real-time events
  const handleRealtimeEvent = useCallback((payload: any) => {
    logger.debug('Realtime event received:', payload);

    if (config.batchUpdates) {
      // Add to batch queue
      batchQueueRef.current.push(payload);
      
      // Process batch when it reaches max size
      if (batchQueueRef.current.length >= (config.maxBatchSize || 10)) {
        throttledUpdate(batchQueueRef.current);
      }
    } else {
      // Process immediately (throttled)
      throttledUpdate([payload]);
    }
  }, [throttledUpdate, config.batchUpdates, config.maxBatchSize]);

  // Connection management with retry logic
  const connect = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    try {
      const channel = supabase.channel(`realtime-${config.table}-${Date.now()}`);
      
      const subscription = channel
        .on(
          'postgres_changes',
          {
            event: config.event || '*',
            schema: 'public',
            table: config.table,
            filter: config.filter,
          },
          handleRealtimeEvent
        )
        .subscribe((status: string) => {
          logger.debug(`Realtime subscription status: ${status}`);
          
          setState(prev => ({
            ...prev,
            isConnected: status === 'SUBSCRIBED',
            error: status === 'CHANNEL_ERROR' ? 'Connection failed' : null,
          }));

          if (status === 'SUBSCRIBED') {
            connectionRetryRef.current = 0; // Reset retry counter on success
          } else if (status === 'CHANNEL_ERROR' && connectionRetryRef.current < maxRetries) {
            // Retry connection with exponential backoff
            const retryDelay = Math.pow(2, connectionRetryRef.current) * 1000;
            connectionRetryRef.current++;
            
            logger.warn(`Realtime connection failed, retrying in ${retryDelay}ms (attempt ${connectionRetryRef.current})`);
            
            setTimeout(() => {
              connect();
            }, retryDelay);
          }
        });

      subscriptionRef.current = subscription;
    } catch (error) {
      logger.error('Failed to establish realtime connection:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: 'Connection setup failed',
      }));
    }
  }, [config, handleRealtimeEvent]);

  // Manual refresh function
  const refetch = useCallback(() => {
    // Trigger a manual data refresh
    // This would typically involve calling the original data fetching function
    logger.debug('Manual refetch requested');
  }, []);

  // Manual update function for optimistic updates
  const manualUpdate = useCallback((newData: T[]) => {
    setState(prev => ({
      ...prev,
      data: newData,
      lastUpdate: new Date(),
    }));
  }, []);

  // Setup and cleanup
  useEffect(() => {
    connect();

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [connect]);

  // Update initial data when it changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      data: initialData,
    }));
  }, [initialData]);

  return {
    ...state,
    refetch,
    manualUpdate,
  };
}

// Enhanced hook for price data with smart optimization
export function usePriceRealtime(initialPrices: any[], options?: {
  enableSmartThrottling?: boolean;
  enableConflictResolution?: boolean;
  enableOfflineSync?: boolean;
}) {
  const {
    enableSmartThrottling = true,
    enableConflictResolution = true,
    enableOfflineSync = true
  } = options || {};

  // Dynamic throttling based on update frequency
  const [adaptiveThrottleMs, setAdaptiveThrottleMs] = useState(1000);
  const updateFrequency = useRef(0);
  const lastUpdateTime = useRef(Date.now());

  // Adjust throttling based on update frequency
  useEffect(() => {
    if (!enableSmartThrottling) return;

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastUpdateTime.current;
      
      if (timeDiff < 5000 && updateFrequency.current > 10) {
        // High frequency updates - increase throttling
        setAdaptiveThrottleMs(prev => Math.min(prev * 1.5, 3000));
      } else if (timeDiff > 30000) {
        // Low frequency updates - decrease throttling
        setAdaptiveThrottleMs(prev => Math.max(prev * 0.8, 500));
      }
      
      updateFrequency.current = 0;
      lastUpdateTime.current = currentTime;
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [enableSmartThrottling]);

  const realtimeHook = useOptimizedRealtime(initialPrices, {
    table: 'prices',
    event: '*',
    throttleMs: adaptiveThrottleMs,
    batchUpdates: true,
    maxBatchSize: enableSmartThrottling ? Math.min(updateFrequency.current + 3, 10) : 5,
  });

  // Track update frequency
  useEffect(() => {
    updateFrequency.current++;
  }, [realtimeHook.data]);

  return {
    ...realtimeHook,
    adaptiveThrottleMs,
    updateFrequency: updateFrequency.current
  };
}

// Connection quality monitor
export function useRealtimeConnectionQuality() {
  const [quality, setQuality] = useState({
    latency: 0,
    isStable: true,
    lastCheck: new Date(),
  });

  useEffect(() => {
    const checkConnection = async () => {
      const start = performance.now();
      
      try {
        // Simple ping to Supabase
        await supabase.from('prices').select('id').limit(1);
        const latency = performance.now() - start;
        
        setQuality({
          latency,
          isStable: latency < 2000, // Consider stable if under 2 seconds
          lastCheck: new Date(),
        });
      } catch (error) {
        setQuality(prev => ({
          ...prev,
          isStable: false,
          lastCheck: new Date(),
        }));
      }
    };

    // Check connection quality every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    checkConnection(); // Initial check

    return () => clearInterval(interval);
  }, []);

  return quality;
}

// Offline sync manager for POS systems
export class OfflineRealtime {
  private static pendingUpdates: any[] = [];
  private static isOnline = true;

  static init() {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.syncPendingUpdates);
      window.addEventListener('offline', () => {
        this.isOnline = false;
        logger.warn('Device went offline, queueing updates');
      });
    }
  }

  static queueUpdate(update: any) {
    if (!this.isOnline) {
      this.pendingUpdates.push({
        ...update,
        timestamp: new Date().toISOString(),
      });
      logger.debug(`Queued offline update: ${this.pendingUpdates.length} pending`);
    }
  }

  static async syncPendingUpdates() {
    this.isOnline = true;
    
    if (this.pendingUpdates.length === 0) return;

    logger.info(`Syncing ${this.pendingUpdates.length} pending updates`);

    try {
      // Process pending updates in batches
      const batchSize = 10;
      for (let i = 0; i < this.pendingUpdates.length; i += batchSize) {
        const batch = this.pendingUpdates.slice(i, i + batchSize);
        
        // Process batch (implement based on your sync strategy)
        await Promise.all(batch.map(update => this.processPendingUpdate(update)));
      }

      this.pendingUpdates = [];
      logger.info('All pending updates synced successfully');
    } catch (error) {
      logger.error('Failed to sync pending updates:', error);
    }
  }

  private static async processPendingUpdate(update: any) {
    // Implement your sync logic here
    // This would typically involve API calls to update the server
    logger.debug('Processing pending update:', update);
  }
}

// Initialize offline sync
if (typeof window !== 'undefined') {
  OfflineRealtime.init();
}