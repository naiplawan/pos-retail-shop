'use client';

import { logger } from '@/lib/logger';

// Memory optimization utilities for POS systems
export class MemoryOptimizer {
  private static readonly MAX_CACHE_SIZE = 100; // Maximum items in cache
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static memoryCache = new Map<string, { data: any; timestamp: number; size: number }>();
  private static totalCacheSize = 0;
  private static observerActive = false;

  // Initialize memory monitoring
  static init() {
    if (typeof window === 'undefined') return;

    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Setup automatic cleanup
    this.setupAutomaticCleanup();
    
    // Monitor DOM mutations for memory leaks
    this.setupDOMObserver();
  }

  // Smart caching with memory-aware limits
  static cache(key: string, data: any, ttl = this.CACHE_TTL): boolean {
    try {
      const serialized = JSON.stringify(data);
      const size = serialized.length;
      
      // Check if adding this item would exceed memory limits
      if (this.totalCacheSize + size > this.getMemoryBudget()) {
        this.evictOldestItems(size);
      }

      // Remove existing item if updating
      if (this.memoryCache.has(key)) {
        this.totalCacheSize -= this.memoryCache.get(key)!.size;
      }

      // Add new item
      this.memoryCache.set(key, {
        data,
        timestamp: Date.now(),
        size
      });
      
      this.totalCacheSize += size;
      
      logger.debug(`Cached ${key}: ${size} bytes, total: ${this.totalCacheSize} bytes`);
      return true;
    } catch (error) {
      logger.error('Cache operation failed:', error);
      return false;
    }
  }

  // Get cached data with automatic cleanup
  static getCached<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    
    if (!item) return null;
    
    // Check expiry
    if (Date.now() - item.timestamp > this.CACHE_TTL) {
      this.removeCached(key);
      return null;
    }
    
    return item.data;
  }

  // Remove cached item
  static removeCached(key: string): void {
    const item = this.memoryCache.get(key);
    if (item) {
      this.totalCacheSize -= item.size;
      this.memoryCache.delete(key);
    }
  }

  // Clear all cache
  static clearCache(): void {
    this.memoryCache.clear();
    this.totalCacheSize = 0;
    logger.info('Memory cache cleared');
  }

  // Get memory budget based on available memory
  private static getMemoryBudget(): number {
    // Use 10% of available heap or 50MB, whichever is smaller
    const heapSize = this.getHeapSize();
    return Math.min(heapSize * 0.1, 50 * 1024 * 1024);
  }

  // Evict oldest items to make space
  private static evictOldestItems(requiredSize: number): void {
    const items = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    let freedSpace = 0;
    const targetSpace = requiredSize + (this.getMemoryBudget() * 0.1); // Add 10% buffer
    
    for (const [key, item] of items) {
      if (freedSpace >= targetSpace) break;
      
      this.removeCached(key);
      freedSpace += item.size;
    }
    
    logger.debug(`Evicted items, freed ${freedSpace} bytes`);
  }

  // Start memory monitoring
  private static startMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    setInterval(() => {
      const memInfo = this.getMemoryInfo();
      
      // Log memory warnings
      if (memInfo.usedPercent > 80) {
        logger.warn(`High memory usage: ${memInfo.usedPercent.toFixed(1)}%`);
        this.performEmergencyCleanup();
      }
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Memory usage:', memInfo);
      }
    }, 30000); // Check every 30 seconds
  }

  // Get memory information
  static getMemoryInfo() {
    const memory = (performance as any).memory;
    
    if (!memory) {
      return {
        used: 0,
        total: 0,
        usedPercent: 0,
        cacheSize: this.totalCacheSize
      };
    }

    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usedPercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      cacheSize: this.totalCacheSize,
      cacheItems: this.memoryCache.size
    };
  }

  // Get heap size
  private static getHeapSize(): number {
    const memory = (performance as any).memory;
    return memory ? memory.jsHeapSizeLimit : 100 * 1024 * 1024; // Default 100MB
  }

  // Emergency cleanup when memory is high
  private static performEmergencyCleanup(): void {
    logger.warn('Performing emergency memory cleanup');
    
    // Clear cache aggressively
    this.clearCache();
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
    
    // Clean up DOM event listeners
    this.cleanupEventListeners();
  }

  // Setup automatic cleanup
  private static setupAutomaticCleanup(): void {
    // Clean up expired items every 2 minutes
    setInterval(() => {
      const now = Date.now();
      const expired: string[] = [];
      
      for (const [key, item] of this.memoryCache.entries()) {
        if (now - item.timestamp > this.CACHE_TTL) {
          expired.push(key);
        }
      }
      
      expired.forEach(key => this.removeCached(key));
      
      if (expired.length > 0) {
        logger.debug(`Cleaned up ${expired.length} expired cache items`);
      }
    }, 2 * 60 * 1000);
  }

  // Setup DOM observer for memory leak detection
  private static setupDOMObserver(): void {
    if (this.observerActive || !('MutationObserver' in window)) return;

    let nodeCount = 0;
    const observer = new MutationObserver((mutations) => {
      let addedNodes = 0;
      
      mutations.forEach(mutation => {
        addedNodes += mutation.addedNodes.length;
      });
      
      nodeCount += addedNodes;
      
      // Alert if DOM is growing too fast
      if (addedNodes > 50) {
        logger.warn(`Large DOM change detected: ${addedNodes} nodes added`);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observerActive = true;
  }

  // Clean up event listeners that might cause memory leaks
  private static cleanupEventListeners(): void {
    // Remove any global event listeners that might be hanging around
    const events = ['resize', 'scroll', 'mousemove', 'touchmove'];
    
    events.forEach(event => {
      const listeners = (window as any)._eventListeners?.[event] || [];
      logger.debug(`Found ${listeners.length} ${event} listeners`);
    });
  }

  // Memory-aware component wrapper
  static wrapComponent<T extends React.ComponentType<any>>(
    Component: T,
    options: { cacheKey?: string; memoryLimit?: number } = {}
  ): T {
    return React.memo(Component as any, (prevProps, nextProps) => {
      // Custom comparison logic that considers memory usage
      const memInfo = this.getMemoryInfo();
      
      if (memInfo.usedPercent > 90) {
        // Skip expensive re-renders when memory is critical
        return true;
      }
      
      // Standard shallow comparison
      return Object.keys(prevProps).every(key => 
        prevProps[key] === nextProps[key]
      );
    }) as T;
  }

  // Lazy loading with memory management
  static lazyWithMemoryManagement<T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
  ) {
    return React.lazy(async () => {
      const memInfo = this.getMemoryInfo();
      
      // Delay loading if memory is too high
      if (memInfo.usedPercent > 85) {
        logger.warn('Delaying component load due to high memory usage');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return importFunc();
    });
  }

  // Debounced function factory with memory awareness
  static createMemoryAwareDebounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T {
    let timeoutId: NodeJS.Timeout;
    let lastArgs: Parameters<T>;
    
    return ((...args: Parameters<T>) => {
      lastArgs = args;
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        const memInfo = this.getMemoryInfo();
        
        // Skip execution if memory is critical
        if (memInfo.usedPercent > 95) {
          logger.warn('Skipping debounced function due to critical memory usage');
          return;
        }
        
        func(...lastArgs);
      }, delay);
    }) as T;
  }

  // Image optimization for memory
  static optimizeImageForMemory(imageUrl: string, maxWidth = 800, quality = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const optimizedUrl = canvas.toDataURL('image/jpeg', quality);
        
        resolve(optimizedUrl);
      };
      
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  // Get cache statistics
  static getCacheStats() {
    return {
      items: this.memoryCache.size,
      totalSize: this.totalCacheSize,
      memoryInfo: this.getMemoryInfo(),
      oldestItem: Math.min(...Array.from(this.memoryCache.values()).map(item => item.timestamp)),
      newestItem: Math.max(...Array.from(this.memoryCache.values()).map(item => item.timestamp))
    };
  }
}

// React hook for memory monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = React.useState(MemoryOptimizer.getMemoryInfo());
  const [cacheStats, setCacheStats] = React.useState(MemoryOptimizer.getCacheStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMemoryInfo(MemoryOptimizer.getMemoryInfo());
      setCacheStats(MemoryOptimizer.getCacheStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    memoryInfo,
    cacheStats,
    clearCache: MemoryOptimizer.clearCache,
    getCached: MemoryOptimizer.getCached,
    cache: MemoryOptimizer.cache
  };
}

// Memory-aware data fetching hook
export function useMemoryAwareFetch<T>(
  url: string,
  options: { 
    cacheKey?: string; 
    maxAge?: number;
    memoryThreshold?: number;
  } = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const { cacheKey = url, maxAge = 300000, memoryThreshold = 80 } = options;

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Check memory before fetching
        const memInfo = MemoryOptimizer.getMemoryInfo();
        if (memInfo.usedPercent > memoryThreshold) {
          logger.warn('Skipping fetch due to high memory usage');
          return;
        }

        // Check cache first
        const cached = MemoryOptimizer.getCached<T>(cacheKey);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }

        // Fetch from network
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        // Cache the result
        MemoryOptimizer.cache(cacheKey, result, maxAge);
        
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, cacheKey, maxAge, memoryThreshold]);

  return { data, loading, error };
}

// Initialize memory optimizer
if (typeof window !== 'undefined') {
  MemoryOptimizer.init();
}