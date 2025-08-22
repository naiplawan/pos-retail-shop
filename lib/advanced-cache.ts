'use client';

import { logger } from './logger';

// Cache entry interface with TTL and metadata
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  version?: string;
}

// Cache statistics for monitoring
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  memoryUsage: number;
  evictions: number;
  lastCleanup: number;
}

// Cache configuration
interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  maxMemoryUsage: number; // in bytes
  enableCompression: boolean;
  enableEncryption: boolean;
  cleanupInterval: number;
  persistToDisk: boolean;
}

// LRU Cache with advanced features
export class AdvancedCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    memoryUsage: 0,
    evictions: 0,
    lastCleanup: Date.now()
  };
  
  private config: CacheConfig;
  private accessCounter = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private subscribers = new Set<(key: string, event: 'set' | 'delete' | 'evict') => void>();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      enableCompression: false,
      enableEncryption: false,
      cleanupInterval: 60 * 1000, // 1 minute
      persistToDisk: false,
      ...config
    };

    this.startCleanupTimer();
    this.loadFromDisk();

    // Listen for memory pressure events
    if (typeof window !== 'undefined' && 'memory' in performance) {
      this.monitorMemoryPressure();
    }
  }

  // Get cached value with intelligent prefetching
  async get<T>(key: string, options?: {
    prefetch?: string[];
    updateTtl?: boolean;
  }): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    this.accessOrder.set(key, ++this.accessCounter);
    entry.hits++;
    this.stats.hits++;

    // Update TTL if requested
    if (options?.updateTtl) {
      entry.ttl = this.config.defaultTtl;
      entry.timestamp = Date.now();
    }

    // Prefetch related keys
    if (options?.prefetch) {
      this.prefetchKeys(options.prefetch);
    }

    logger.debug(`Cache hit for key: ${key} (hits: ${entry.hits})`);
    return entry.data;
  }

  // Set cached value with intelligent eviction
  async set<T>(
    key: string, 
    data: T, 
    options?: {
      ttl?: number;
      tags?: string[];
      priority?: CacheEntry['priority'];
      version?: string;
    }
  ): Promise<void> {
    const ttl = options?.ttl ?? this.config.defaultTtl;
    const tags = options?.tags ?? [];
    const priority = options?.priority ?? 'medium';
    const size = this.calculateSize(data);

    // Check memory limits before adding
    if (this.stats.memoryUsage + size > this.config.maxMemoryUsage) {
      await this.evictByMemoryPressure(size);
    }

    // Check size limits
    if (this.cache.size >= this.config.maxSize) {
      await this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size,
      tags,
      priority,
      version: options?.version
    };

    // Remove existing entry to update stats
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.stats.memoryUsage -= oldEntry.size;
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.size = this.cache.size;
    this.stats.memoryUsage += size;

    this.notifySubscribers(key, 'set');
    await this.persistToDiskIfEnabled();
    
    logger.debug(`Cached key: ${key} (size: ${size} bytes, ttl: ${ttl}ms)`);
  }

  // Delete specific key
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.stats.size = this.cache.size;
    this.stats.memoryUsage -= entry.size;

    this.notifySubscribers(key, 'delete');
    return true;
  }

  // Clear cache by tags
  async clearByTags(tags: string[]): Promise<number> {
    let cleared = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      if (this.delete(key)) cleared++;
    });

    await this.persistToDiskIfEnabled();
    logger.info(`Cleared ${cleared} entries by tags: ${tags.join(', ')}`);
    return cleared;
  }

  // Bulk operations for performance
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    for (const key of keys) {
      results.set(key, await this.get<T>(key));
    }
    
    return results;
  }

  async mset<T>(entries: Array<{ key: string; data: T; options?: any }>): Promise<void> {
    const promises = entries.map(({ key, data, options }) => 
      this.set(key, data, options)
    );
    
    await Promise.all(promises);
  }

  // Cache warming strategies
  async warmCache(patterns: Array<{
    keyPattern: string;
    dataLoader: () => Promise<any>;
    priority?: CacheEntry['priority'];
    tags?: string[];
  }>): Promise<void> {
    logger.info(`Warming cache with ${patterns.length} patterns`);
    
    const warmingPromises = patterns.map(async ({ keyPattern, dataLoader, priority, tags }) => {
      try {
        const data = await dataLoader();
        await this.set(keyPattern, data, { priority, tags });
      } catch (error) {
        logger.error(`Failed to warm cache for pattern ${keyPattern}:`, error);
      }
    });

    await Promise.all(warmingPromises);
  }

  // Intelligent prefetching
  private async prefetchKeys(keys: string[]): Promise<void> {
    const missingKeys = keys.filter(key => !this.cache.has(key));
    
    if (missingKeys.length > 0) {
      logger.debug(`Prefetching ${missingKeys.length} keys`);
      // Implement your prefetch logic here
      // This could involve API calls or database queries
    }
  }

  // Memory pressure handling
  private monitorMemoryPressure(): void {
    if (typeof window === 'undefined') return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        logger.warn('Memory pressure detected, performing aggressive cache cleanup');
        this.evictByMemoryPressure(this.stats.memoryUsage * 0.3);
      }
    };

    setInterval(checkMemory, 30000); // Check every 30 seconds
  }

  // LRU eviction strategy
  private async evictLRU(): Promise<void> {
    if (this.cache.size === 0) return;

    let lruKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
      this.notifySubscribers(lruKey, 'evict');
      logger.debug(`Evicted LRU key: ${lruKey}`);
    }
  }

  // Memory-based eviction
  private async evictByMemoryPressure(targetReduction: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry, accessTime: this.accessOrder.get(key) || 0 }))
      .sort((a, b) => {
        // Sort by priority (low first) then by access time (oldest first)
        const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        const priorityDiff = priorityOrder[a.entry.priority] - priorityOrder[b.entry.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.accessTime - b.accessTime;
      });

    let reducedMemory = 0;
    let evicted = 0;

    for (const { key, entry } of entries) {
      if (reducedMemory >= targetReduction) break;
      if (entry.priority === 'critical') continue; // Never evict critical entries

      this.delete(key);
      reducedMemory += entry.size;
      evicted++;
      this.stats.evictions++;
      this.notifySubscribers(key, 'evict');
    }

    logger.info(`Evicted ${evicted} entries, freed ${reducedMemory} bytes`);
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleaned++;
      }
    }

    this.stats.lastCleanup = now;
    
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired entries`);
    }
  }

  // Check if entry is expired
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // Calculate data size estimation
  private calculateSize(data: any): number {
    if (typeof data === 'string') {
      return data.length * 2; // Rough UTF-16 estimation
    }
    
    if (typeof data === 'number') {
      return 8; // 64-bit number
    }
    
    if (typeof data === 'boolean') {
      return 4;
    }
    
    if (data === null || data === undefined) {
      return 0;
    }
    
    if (Array.isArray(data)) {
      return data.reduce((sum, item) => sum + this.calculateSize(item), 0);
    }
    
    if (typeof data === 'object') {
      return Object.entries(data).reduce(
        (sum, [key, value]) => sum + this.calculateSize(key) + this.calculateSize(value),
        0
      );
    }
    
    return JSON.stringify(data).length * 2; // Fallback
  }

  // Persistence to disk (using IndexedDB)
  private async persistToDiskIfEnabled(): Promise<void> {
    if (!this.config.persistToDisk || typeof window === 'undefined') return;

    try {
      const serializedCache = Array.from(this.cache.entries());
      localStorage.setItem('advanced-cache', JSON.stringify(serializedCache));
    } catch (error) {
      logger.error('Failed to persist cache to disk:', error);
    }
  }

  private loadFromDisk(): void {
    if (!this.config.persistToDisk || typeof window === 'undefined') return;

    try {
      const serialized = localStorage.getItem('advanced-cache');
      if (serialized) {
        const entries = JSON.parse(serialized) as [string, CacheEntry][];
        
        for (const [key, entry] of entries) {
          if (!this.isExpired(entry)) {
            this.cache.set(key, entry);
            this.accessOrder.set(key, ++this.accessCounter);
            this.stats.memoryUsage += entry.size;
          }
        }
        
        this.stats.size = this.cache.size;
        logger.info(`Loaded ${this.cache.size} entries from disk cache`);
      }
    } catch (error) {
      logger.error('Failed to load cache from disk:', error);
    }
  }

  // Timer management
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // Subscription system for cache events
  subscribe(callback: (key: string, event: 'set' | 'delete' | 'evict') => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(key: string, event: 'set' | 'delete' | 'evict'): void {
    this.subscribers.forEach(callback => {
      try {
        callback(key, event);
      } catch (error) {
        logger.error('Cache subscriber error:', error);
      }
    });
  }

  // Analytics and monitoring
  getStats(): CacheStats & { hitRate: number; averageSize: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      averageSize: this.cache.size > 0 ? this.stats.memoryUsage / this.cache.size : 0
    };
  }

  // Export cache for debugging
  exportCache(): Array<{ key: string; entry: CacheEntry }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
  }

  // Clear all cache
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      memoryUsage: 0,
      evictions: 0,
      lastCleanup: Date.now()
    };
    
    logger.info(`Cleared entire cache (${size} entries)`);
  }

  // Cleanup resources
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clear();
    this.subscribers.clear();
  }
}

// Global cache instances
export const globalCache = new AdvancedCache({
  maxSize: 1000,
  defaultTtl: 5 * 60 * 1000,
  maxMemoryUsage: 50 * 1024 * 1024,
  persistToDisk: true
});

export const apiCache = new AdvancedCache({
  maxSize: 500,
  defaultTtl: 2 * 60 * 1000, // 2 minutes for API responses
  maxMemoryUsage: 20 * 1024 * 1024,
  persistToDisk: false
});

export const staticCache = new AdvancedCache({
  maxSize: 200,
  defaultTtl: 60 * 60 * 1000, // 1 hour for static resources
  maxMemoryUsage: 10 * 1024 * 1024,
  persistToDisk: true
});

// Cache key generators
export const cacheKeys = {
  product: (id: string) => `product:${id}`,
  productList: (filters: Record<string, any>) => 
    `products:${JSON.stringify(filters)}`,
  priceHistory: (productId: string, days: number) => 
    `price-history:${productId}:${days}`,
  dashboard: (userId: string, date: string) => 
    `dashboard:${userId}:${date}`,
  summary: (type: string, period: string) => 
    `summary:${type}:${period}`
};

// High-level cache utilities
export class CacheManager {
  static async getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      cache?: AdvancedCache;
      ttl?: number;
      tags?: string[];
      priority?: CacheEntry['priority'];
    }
  ): Promise<T> {
    const cache = options?.cache || globalCache;
    
    // Try to get from cache first
    let data = await cache.get<T>(key);
    
    if (data === null) {
      // Cache miss - fetch data
      try {
        data = await fetcher();
        await cache.set(key, data, {
          ttl: options?.ttl,
          tags: options?.tags,
          priority: options?.priority
        });
      } catch (error) {
        logger.error(`Failed to fetch data for key ${key}:`, error);
        throw error;
      }
    }
    
    return data;
  }

  static async invalidateByPattern(pattern: RegExp, cache = globalCache): Promise<number> {
    const keysToDelete: string[] = [];
    
    for (const [key] of cache.cache) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => cache.delete(key));
    
    logger.info(`Invalidated ${keysToDelete.length} keys matching pattern: ${pattern}`);
    return keysToDelete.length;
  }

  static async warmupProductCache(productIds: string[]): Promise<void> {
    const warmupPatterns = productIds.map(id => ({
      keyPattern: cacheKeys.product(id),
      dataLoader: async () => {
        // Implement your product loading logic here
        // This is a placeholder
        return { id, name: `Product ${id}`, price: 100 };
      },
      priority: 'high' as const,
      tags: ['product', 'warmup']
    }));

    await globalCache.warmCache(warmupPatterns);
  }
}

// React hook for cache integration
export function useAdvancedCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    enabled?: boolean;
    cache?: AdvancedCache;
    ttl?: number;
    tags?: string[];
    priority?: CacheEntry['priority'];
  }
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const cache = options?.cache || globalCache;
  const enabled = options?.enabled ?? true;

  React.useEffect(() => {
    if (!enabled) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await CacheManager.getCachedOrFetch(key, fetcher, options);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, enabled]);

  const invalidate = React.useCallback(() => {
    cache.delete(key);
  }, [key, cache]);

  const refetch = React.useCallback(async () => {
    cache.delete(key);
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      await cache.set(key, result, options);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, cache, options]);

  return { data, loading, error, invalidate, refetch };
}

// Cache performance monitoring
export class CacheMonitor {
  private static instances = new Map<string, AdvancedCache>();

  static register(name: string, cache: AdvancedCache): void {
    this.instances.set(name, cache);
  }

  static getGlobalStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [name, cache] of this.instances) {
      stats[name] = cache.getStats();
    }
    
    return stats;
  }

  static startPerformanceLogging(intervalMs = 60000): () => void {
    const interval = setInterval(() => {
      const stats = this.getGlobalStats();
      logger.info('Cache Performance Report:', stats);
    }, intervalMs);

    return () => clearInterval(interval);
  }
}

// Register default caches for monitoring
CacheMonitor.register('global', globalCache);
CacheMonitor.register('api', apiCache);
CacheMonitor.register('static', staticCache);

// Auto-start performance logging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  CacheMonitor.startPerformanceLogging();
}