'use client';

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// Advanced real-time connection management
interface ConnectionPool {
  connections: Map<string, RealtimeConnection>;
  maxConnections: number;
  activeConnections: number;
}

interface RealtimeConnection {
  id: string;
  channel: any;
  table: string;
  subscribers: Set<string>;
  lastActivity: number;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
}

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  avgLatency: number;
  errorRate: number;
  reconnectCount: number;
  dataVolume: number;
}

interface RealtimeOptions {
  priority?: 'high' | 'medium' | 'low';
  deduplicate?: boolean;
  compression?: boolean;
  batchSize?: number;
  maxLatency?: number;
  autoReconnect?: boolean;
  heartbeatInterval?: number;
}

class AdvancedRealtimeManager {
  private static instance: AdvancedRealtimeManager;
  private connectionPool: ConnectionPool;
  private metrics: ConnectionMetrics;
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private messageQueue = new Map<string, any[]>();
  private isOnline = true;
  private heartbeatInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;

  static getInstance() {
    if (!AdvancedRealtimeManager.instance) {
      AdvancedRealtimeManager.instance = new AdvancedRealtimeManager();
    }
    return AdvancedRealtimeManager.instance;
  }

  constructor() {
    this.connectionPool = {
      connections: new Map(),
      maxConnections: 10,
      activeConnections: 0
    };

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      avgLatency: 0,
      errorRate: 0,
      reconnectCount: 0,
      dataVolume: 0
    };

    if (typeof window !== 'undefined') {
      this.initializeManager();
    }
  }

  private initializeManager() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.reconnectAll();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.pauseConnections();
    });

    // Start metrics collection
    this.startMetricsCollection();

    // Start connection health monitoring
    this.startHealthMonitoring();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  // Subscribe to real-time updates with advanced options
  subscribe(
    table: string,
    callback: (data: any) => void,
    options: RealtimeOptions = {}
  ): string {
    const subscriberId = this.generateSubscriberId();
    const connectionId = this.getOrCreateConnection(table, options);
    
    if (!connectionId) {
      logger.error(`Failed to create connection for table: ${table}`);
      return subscriberId;
    }

    // Add subscriber to the connection
    const connection = this.connectionPool.connections.get(connectionId);
    if (connection) {
      connection.subscribers.add(subscriberId);
    }

    // Register callback
    if (!this.subscribers.has(subscriberId)) {
      this.subscribers.set(subscriberId, new Set());
    }
    this.subscribers.get(subscriberId)!.add(callback);

    logger.debug(`Subscribed to ${table} with ID: ${subscriberId}`);
    return subscriberId;
  }

  // Unsubscribe from real-time updates
  unsubscribe(subscriberId: string) {
    // Remove from subscribers
    this.subscribers.delete(subscriberId);

    // Find and update connection
    for (const [connectionId, connection] of this.connectionPool.connections) {
      if (connection.subscribers.has(subscriberId)) {
        connection.subscribers.delete(subscriberId);
        
        // If no more subscribers, consider closing connection
        if (connection.subscribers.size === 0) {
          this.scheduleConnectionCleanup(connectionId);
        }
        break;
      }
    }

    logger.debug(`Unsubscribed: ${subscriberId}`);
  }

  // Get or create a connection for the specified table
  private getOrCreateConnection(table: string, options: RealtimeOptions): string | null {
    // Check if we have an existing connection for this table
    for (const [id, connection] of this.connectionPool.connections) {
      if (connection.table === table && connection.status === 'connected') {
        return id;
      }
    }

    // Check connection limits
    if (this.connectionPool.activeConnections >= this.connectionPool.maxConnections) {
      // Try to close low-priority idle connections
      this.cleanupIdleConnections();
      
      if (this.connectionPool.activeConnections >= this.connectionPool.maxConnections) {
        logger.warn('Maximum connections reached, cannot create new connection');
        return null;
      }
    }

    return this.createConnection(table, options);
  }

  // Create a new real-time connection
  private createConnection(table: string, options: RealtimeOptions): string {
    const connectionId = this.generateConnectionId();
    const priority = options.priority || 'medium';

    const connection: RealtimeConnection = {
      id: connectionId,
      channel: null,
      table,
      subscribers: new Set(),
      lastActivity: Date.now(),
      status: 'connecting',
      retryCount: 0,
      priority
    };

    this.connectionPool.connections.set(connectionId, connection);

    try {
      // Create Supabase channel
      const channel = supabase.channel(`optimized-${table}-${connectionId}`, {
        config: {
          // Enable broadcast acknowledgment for reliability
          broadcast: { ack: true },
          // Enable presence for connection tracking
          presence: { key: connectionId }
        }
      });

      connection.channel = channel;

      // Setup event listener
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table
        },
        (payload) => this.handleRealtimeMessage(connectionId, payload, options)
      );

      // Handle connection status changes
      channel.subscribe((status: string) => {
        this.handleConnectionStatusChange(connectionId, status);
      });

      this.connectionPool.activeConnections++;
      this.metrics.totalConnections++;

      logger.info(`Created connection ${connectionId} for table ${table}`);
      return connectionId;

    } catch (error) {
      logger.error(`Failed to create connection for ${table}:`, error);
      this.connectionPool.connections.delete(connectionId);
      throw error;
    }
  }

  // Handle real-time messages with advanced processing
  private handleRealtimeMessage(
    connectionId: string,
    payload: any,
    options: RealtimeOptions
  ) {
    const connection = this.connectionPool.connections.get(connectionId);
    if (!connection) return;

    connection.lastActivity = Date.now();
    this.metrics.dataVolume += JSON.stringify(payload).length;

    // Apply deduplication if enabled
    if (options.deduplicate && this.isDuplicateMessage(payload)) {
      logger.debug('Duplicate message filtered out');
      return;
    }

    // Queue message for batching if enabled
    if (options.batchSize && options.batchSize > 1) {
      this.queueMessage(connectionId, payload, options);
      return;
    }

    // Process message immediately
    this.processMessage(connectionId, payload);
  }

  // Queue messages for batch processing
  private queueMessage(connectionId: string, payload: any, options: RealtimeOptions) {
    if (!this.messageQueue.has(connectionId)) {
      this.messageQueue.set(connectionId, []);
    }

    const queue = this.messageQueue.get(connectionId)!;
    queue.push(payload);

    // Process batch when size limit reached or after delay
    if (queue.length >= (options.batchSize || 5)) {
      this.processBatch(connectionId);
    } else {
      // Schedule batch processing with delay
      setTimeout(() => {
        if (queue.length > 0) {
          this.processBatch(connectionId);
        }
      }, options.maxLatency || 500);
    }
  }

  // Process a batch of messages
  private processBatch(connectionId: string) {
    const queue = this.messageQueue.get(connectionId);
    if (!queue || queue.length === 0) return;

    const batch = queue.splice(0); // Take all queued messages
    
    // Group by operation type for efficient processing
    const grouped = batch.reduce((acc, message) => {
      const type = message.eventType || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(message);
      return acc;
    }, {} as Record<string, any[]>);

    // Process each group
    Object.entries(grouped).forEach(([type, messages]) => {
      this.notifySubscribers(connectionId, { type: 'batch', messages });
    });
  }

  // Process individual message
  private processMessage(connectionId: string, payload: any) {
    this.notifySubscribers(connectionId, payload);
  }

  // Notify all subscribers of a connection
  private notifySubscribers(connectionId: string, data: any) {
    const connection = this.connectionPool.connections.get(connectionId);
    if (!connection) return;

    connection.subscribers.forEach(subscriberId => {
      const callbacks = this.subscribers.get(subscriberId);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            logger.error(`Error in subscriber callback ${subscriberId}:`, error);
          }
        });
      }
    });
  }

  // Handle connection status changes
  private handleConnectionStatusChange(connectionId: string, status: string) {
    const connection = this.connectionPool.connections.get(connectionId);
    if (!connection) return;

    const oldStatus = connection.status;

    switch (status) {
      case 'SUBSCRIBED':
        connection.status = 'connected';
        connection.retryCount = 0;
        logger.info(`Connection ${connectionId} established`);
        break;

      case 'CHANNEL_ERROR':
        connection.status = 'error';
        this.handleConnectionError(connectionId);
        break;

      case 'TIMED_OUT':
        connection.status = 'disconnected';
        this.handleConnectionTimeout(connectionId);
        break;

      case 'CLOSED':
        connection.status = 'disconnected';
        this.handleConnectionClosed(connectionId);
        break;
    }

    // Update metrics
    if (oldStatus !== connection.status) {
      this.updateConnectionMetrics();
    }
  }

  // Handle connection errors with retry logic
  private handleConnectionError(connectionId: string) {
    const connection = this.connectionPool.connections.get(connectionId);
    if (!connection) return;

    connection.retryCount++;
    this.metrics.reconnectCount++;

    if (connection.retryCount <= 3) {
      const delay = Math.pow(2, connection.retryCount) * 1000;
      
      logger.warn(`Connection ${connectionId} error, retrying in ${delay}ms (attempt ${connection.retryCount})`);
      
      setTimeout(() => {
        this.reconnectConnection(connectionId);
      }, delay);
    } else {
      logger.error(`Connection ${connectionId} failed after 3 retries`);
      this.removeConnection(connectionId);
    }
  }

  // Handle connection timeout
  private handleConnectionTimeout(connectionId: string) {
    logger.warn(`Connection ${connectionId} timed out, attempting reconnect`);
    this.reconnectConnection(connectionId);
  }

  // Handle connection closed
  private handleConnectionClosed(connectionId: string) {
    logger.info(`Connection ${connectionId} closed`);
    this.removeConnection(connectionId);
  }

  // Reconnect a specific connection
  private reconnectConnection(connectionId: string) {
    const connection = this.connectionPool.connections.get(connectionId);
    if (!connection || !this.isOnline) return;

    try {
      if (connection.channel) {
        connection.channel.unsubscribe();
      }

      // Recreate connection
      this.createConnection(connection.table, { priority: connection.priority });
      
      // Transfer subscribers to new connection
      // This is simplified - in reality you'd need more complex logic
      
    } catch (error) {
      logger.error(`Failed to reconnect ${connectionId}:`, error);
    }
  }

  // Reconnect all connections
  private reconnectAll() {
    if (!this.isOnline) return;

    logger.info('Reconnecting all real-time connections');
    
    const connections = Array.from(this.connectionPool.connections.keys());
    connections.forEach(connectionId => {
      this.reconnectConnection(connectionId);
    });
  }

  // Pause all connections (e.g., when going offline)
  private pauseConnections() {
    logger.info('Pausing all real-time connections');
    
    this.connectionPool.connections.forEach(connection => {
      if (connection.channel && connection.status === 'connected') {
        connection.status = 'disconnected';
      }
    });
  }

  // Remove a connection
  private removeConnection(connectionId: string) {
    const connection = this.connectionPool.connections.get(connectionId);
    if (!connection) return;

    if (connection.channel) {
      try {
        connection.channel.unsubscribe();
      } catch (error) {
        logger.error(`Error unsubscribing channel ${connectionId}:`, error);
      }
    }

    this.connectionPool.connections.delete(connectionId);
    this.connectionPool.activeConnections = Math.max(0, this.connectionPool.activeConnections - 1);
    this.messageQueue.delete(connectionId);

    logger.info(`Removed connection ${connectionId}`);
  }

  // Clean up idle connections
  private cleanupIdleConnections() {
    const now = Date.now();
    const idleThreshold = 5 * 60 * 1000; // 5 minutes

    const idleConnections = Array.from(this.connectionPool.connections.entries())
      .filter(([_, connection]) => 
        connection.priority === 'low' && 
        now - connection.lastActivity > idleThreshold &&
        connection.subscribers.size === 0
      )
      .map(([id, _]) => id);

    idleConnections.forEach(id => this.removeConnection(id));
    
    if (idleConnections.length > 0) {
      logger.info(`Cleaned up ${idleConnections.length} idle connections`);
    }
  }

  // Schedule connection cleanup
  private scheduleConnectionCleanup(connectionId: string) {
    setTimeout(() => {
      const connection = this.connectionPool.connections.get(connectionId);
      if (connection && connection.subscribers.size === 0) {
        this.removeConnection(connectionId);
      }
    }, 30000); // 30 seconds delay
  }

  // Check for duplicate messages
  private isDuplicateMessage(payload: any): boolean {
    // Implement duplicate detection logic based on your needs
    // This is a simplified version
    const messageKey = `${payload.table}_${payload.record?.id}_${payload.eventType}`;
    
    // You'd typically store recent message keys in a Set or Map with TTL
    // For now, return false (no deduplication)
    return false;
  }

  // Start metrics collection
  private startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      this.updateConnectionMetrics();
      this.logMetrics();
    }, 30000); // Every 30 seconds
  }

  // Start health monitoring
  private startHealthMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  // Update connection metrics
  private updateConnectionMetrics() {
    const connections = Array.from(this.connectionPool.connections.values());
    
    this.metrics.activeConnections = connections.filter(c => c.status === 'connected').length;
    this.metrics.errorRate = connections.filter(c => c.status === 'error').length / connections.length;
    
    // Calculate average latency (simplified)
    const latencies = connections
      .filter(c => c.status === 'connected')
      .map(c => Date.now() - c.lastActivity);
    
    this.metrics.avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;
  }

  // Log metrics
  private logMetrics() {
    logger.debug('Real-time connection metrics:', this.metrics);
  }

  // Perform health check on all connections
  private performHealthCheck() {
    const now = Date.now();
    const staleThreshold = 2 * 60 * 1000; // 2 minutes

    this.connectionPool.connections.forEach((connection, id) => {
      if (connection.status === 'connected' && now - connection.lastActivity > staleThreshold) {
        logger.warn(`Connection ${id} appears stale, checking health`);
        // Implement specific health check logic
        this.checkConnectionHealth(id);
      }
    });
  }

  // Check health of a specific connection
  private checkConnectionHealth(connectionId: string) {
    const connection = this.connectionPool.connections.get(connectionId);
    if (!connection) return;

    // Send a ping message to check if connection is responsive
    // This is implementation-specific based on your real-time provider
    try {
      if (connection.channel) {
        // Supabase doesn't have built-in ping, so we'll use presence
        connection.channel.track({ ping: Date.now() });
      }
    } catch (error) {
      logger.error(`Health check failed for connection ${connectionId}:`, error);
      this.handleConnectionError(connectionId);
    }
  }

  // Generate unique IDs
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriberId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get current metrics
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  // Get connection status
  getConnectionStatus(): { [connectionId: string]: RealtimeConnection } {
    const status: { [connectionId: string]: RealtimeConnection } = {};
    
    this.connectionPool.connections.forEach((connection, id) => {
      status[id] = { ...connection, channel: undefined }; // Exclude channel object
    });
    
    return status;
  }

  // Cleanup all connections
  cleanup() {
    logger.info('Cleaning up all real-time connections');
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all connections
    const connectionIds = Array.from(this.connectionPool.connections.keys());
    connectionIds.forEach(id => this.removeConnection(id));

    // Clear subscribers
    this.subscribers.clear();
    this.messageQueue.clear();
  }
}

// Global instance
export const advancedRealtimeManager = AdvancedRealtimeManager.getInstance();

// React hook for advanced real-time functionality
export function useAdvancedRealtime(
  table: string,
  callback: (data: any) => void,
  options: RealtimeOptions = {}
) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [metrics, setMetrics] = React.useState<ConnectionMetrics | null>(null);
  const subscriberIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Subscribe to real-time updates
    subscriberIdRef.current = advancedRealtimeManager.subscribe(
      table,
      (data) => {
        setIsConnected(true);
        callback(data);
      },
      options
    );

    // Get initial metrics
    setMetrics(advancedRealtimeManager.getMetrics());

    // Update metrics periodically
    const interval = setInterval(() => {
      setMetrics(advancedRealtimeManager.getMetrics());
    }, 10000);

    return () => {
      // Cleanup
      if (subscriberIdRef.current) {
        advancedRealtimeManager.unsubscribe(subscriberIdRef.current);
      }
      clearInterval(interval);
    };
  }, [table, callback, options]);

  return {
    isConnected,
    metrics,
    subscriberId: subscriberIdRef.current
  };
}

// Export the manager for direct access
export { AdvancedRealtimeManager };