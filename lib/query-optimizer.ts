'use client';

import { supabase } from './supabase';
import { AdvancedCache, globalCache, apiCache, cacheKeys } from './advanced-cache';
import { logger } from './logger';

// Query optimization strategies
interface QueryOptimizer {
  enableBatching: boolean;
  enableCaching: boolean;
  enablePagination: boolean;
  enablePreloading: boolean;
  batchTimeout: number;
  maxBatchSize: number;
  cacheStrategy: 'aggressive' | 'conservative' | 'adaptive';
}

interface QueryBatch {
  queries: PendingQuery[];
  timeout: NodeJS.Timeout;
  resolver: (results: any[]) => void;
  rejector: (error: Error) => void;
}

interface PendingQuery {
  table: string;
  query: any;
  cacheKey: string;
  priority: number;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

// Enhanced query builder with optimization
export class OptimizedQueryBuilder {
  private config: QueryOptimizer;
  private pendingBatches = new Map<string, QueryBatch>();
  private queryHistory = new Map<string, { count: number; avgDuration: number; lastUsed: number }>();

  constructor(config: Partial<QueryOptimizer> = {}) {
    this.config = {
      enableBatching: true,
      enableCaching: true,
      enablePagination: true,
      enablePreloading: true,
      batchTimeout: 50, // 50ms batch window
      maxBatchSize: 10,
      cacheStrategy: 'adaptive',
      ...config
    };
  }

  // Optimized select with intelligent caching
  async select<T>(
    table: string,
    options: {
      columns?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending: boolean }[];
      limit?: number;
      offset?: number;
      cache?: boolean;
      cacheTtl?: number;
      priority?: number;
      preload?: string[];
    } = {}
  ): Promise<{ data: T[] | null; error: any; fromCache?: boolean }> {
    const {
      columns = '*',
      filters = {},
      orderBy = [],
      limit,
      offset,
      cache = this.config.enableCaching,
      cacheTtl = 5 * 60 * 1000, // 5 minutes
      priority = 1,
      preload = []
    } = options;

    // Generate cache key
    const cacheKey = this.generateCacheKey(table, { columns, filters, orderBy, limit, offset });
    
    // Try cache first if enabled
    if (cache) {
      const cached = await this.getCachedResult<T[]>(cacheKey);
      if (cached !== null) {
        this.updateQueryHistory(cacheKey, 0); // Cache hit has 0 duration
        
        // Preload related data in background
        if (preload.length > 0) {
          this.preloadRelatedData(table, cached, preload);
        }
        
        return { data: cached, error: null, fromCache: true };
      }
    }

    // Build query
    let query = supabase.from(table).select(columns);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object' && value !== null) {
        // Handle range queries, etc.
        if ('gte' in value) query = query.gte(key, value.gte);
        if ('lte' in value) query = query.lte(key, value.lte);
        if ('gt' in value) query = query.gt(key, value.gt);
        if ('lt' in value) query = query.lt(key, value.lt);
        if ('like' in value) query = query.like(key, value.like);
        if ('ilike' in value) query = query.ilike(key, value.ilike);
      } else if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    // Apply ordering
    orderBy.forEach(({ column, ascending }) => {
      query = query.order(column, { ascending });
    });

    // Apply pagination
    if (limit) query = query.limit(limit);
    if (offset) query = query.range(offset, (offset + (limit || 1000)) - 1);

    // Execute query with batching if enabled
    const startTime = performance.now();
    let result;

    if (this.config.enableBatching && priority < 5) {
      result = await this.executeWithBatching(table, query, cacheKey, priority);
    } else {
      result = await query;
    }

    const duration = performance.now() - startTime;
    this.updateQueryHistory(cacheKey, duration);

    // Cache successful results
    if (cache && result.data && !result.error) {
      await this.setCachedResult(cacheKey, result.data, cacheTtl, [`table:${table}`]);
      
      // Preload related data in background
      if (preload.length > 0) {
        this.preloadRelatedData(table, result.data, preload);
      }
    }

    return { ...result, fromCache: false };
  }

  // Optimized insert with cache invalidation
  async insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[],
    options: {
      returning?: string;
      cache?: boolean;
      invalidatePatterns?: RegExp[];
    } = {}
  ): Promise<{ data: T[] | null; error: any }> {
    const { returning = '*', cache = true, invalidatePatterns = [] } = options;

    const query = supabase.from(table).insert(data).select(returning);
    const result = await query;

    // Invalidate related cache entries
    if (cache && result.data && !result.error) {
      await this.invalidateCacheForTable(table);
      
      // Custom invalidation patterns
      for (const pattern of invalidatePatterns) {
        await this.invalidateCacheByPattern(pattern);
      }
    }

    return result;
  }

  // Optimized update with cache invalidation
  async update<T>(
    table: string,
    data: Partial<T>,
    filters: Record<string, any>,
    options: {
      returning?: string;
      cache?: boolean;
      invalidatePatterns?: RegExp[];
    } = {}
  ): Promise<{ data: T[] | null; error: any }> {
    const { returning = '*', cache = true, invalidatePatterns = [] } = options;

    let query = supabase.from(table).update(data);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    if (returning) {
      query = query.select(returning);
    }

    const result = await query;

    // Invalidate related cache entries
    if (cache && result.data && !result.error) {
      await this.invalidateCacheForTable(table);
      
      for (const pattern of invalidatePatterns) {
        await this.invalidateCacheByPattern(pattern);
      }
    }

    return result;
  }

  // Optimized delete with cache invalidation
  async delete(
    table: string,
    filters: Record<string, any>,
    options: {
      cache?: boolean;
      invalidatePatterns?: RegExp[];
    } = {}
  ): Promise<{ data: any; error: any }> {
    const { cache = true, invalidatePatterns = [] } = options;

    let query = supabase.from(table).delete();

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const result = await query;

    // Invalidate related cache entries
    if (cache && !result.error) {
      await this.invalidateCacheForTable(table);
      
      for (const pattern of invalidatePatterns) {
        await this.invalidateCacheByPattern(pattern);
      }
    }

    return result;
  }

  // Smart pagination with lookahead
  async paginatedSelect<T>(
    table: string,
    options: {
      pageSize: number;
      page: number;
      orderBy: { column: string; ascending: boolean }[];
      filters?: Record<string, any>;
      lookahead?: number; // Pages to preload
    }
  ): Promise<{
    data: T[];
    totalCount: number;
    hasMore: boolean;
    nextPage?: number;
    fromCache?: boolean;
  }> {
    const { pageSize, page, orderBy, filters = {}, lookahead = 1 } = options;
    const offset = (page - 1) * pageSize;

    // Get total count (cached)
    const countCacheKey = this.generateCacheKey(`${table}_count`, filters);
    let totalCount = await this.getCachedResult<number>(countCacheKey);

    if (totalCount === null) {
      const countQuery = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      totalCount = countQuery.count || 0;
      await this.setCachedResult(countCacheKey, totalCount, 2 * 60 * 1000, [`table:${table}`]);
    }

    // Get page data
    const result = await this.select<T>(table, {
      filters,
      orderBy,
      limit: pageSize,
      offset,
      cache: true
    });

    // Preload next pages in background
    if (lookahead > 0 && result.data) {
      this.preloadNextPages(table, { pageSize, page, orderBy, filters }, lookahead);
    }

    return {
      data: result.data || [],
      totalCount,
      hasMore: offset + pageSize < totalCount,
      nextPage: offset + pageSize < totalCount ? page + 1 : undefined,
      fromCache: result.fromCache
    };
  }

  // Aggregate queries with caching
  async aggregate(
    table: string,
    options: {
      groupBy?: string[];
      aggregates: {
        field: string;
        function: 'sum' | 'avg' | 'count' | 'min' | 'max';
        alias?: string;
      }[];
      filters?: Record<string, any>;
      cache?: boolean;
      cacheTtl?: number;
    }
  ): Promise<{ data: any[] | null; error: any; fromCache?: boolean }> {
    const {
      groupBy = [],
      aggregates,
      filters = {},
      cache = true,
      cacheTtl = 10 * 60 * 1000 // 10 minutes
    } = options;

    const cacheKey = this.generateCacheKey(`${table}_agg`, { groupBy, aggregates, filters });

    if (cache) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached !== null) {
        return { data: cached, error: null, fromCache: true };
      }
    }

    // Build aggregate query
    const selectFields = [
      ...groupBy,
      ...aggregates.map(agg => `${agg.function}(${agg.field})${agg.alias ? ` as ${agg.alias}` : ''}`)
    ].join(',');

    let query = supabase.from(table).select(selectFields);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const result = await query;

    if (cache && result.data && !result.error) {
      await this.setCachedResult(cacheKey, result.data, cacheTtl, [`table:${table}`, 'aggregate']);
    }

    return { ...result, fromCache: false };
  }

  // Real-time subscriptions with cache sync
  subscribeWithCache<T>(
    table: string,
    options: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      filter?: string;
      callback: (payload: any) => void;
      invalidateCache?: boolean;
    }
  ) {
    const { event = '*', filter, callback, invalidateCache = true } = options;

    const subscription = supabase
      .channel(`${table}_subscription`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table, filter },
        async (payload) => {
          // Call original callback
          callback(payload);

          // Invalidate related cache
          if (invalidateCache) {
            await this.invalidateCacheForTable(table);
          }
        }
      )
      .subscribe();

    return subscription;
  }

  // Cache management methods
  private async getCachedResult<T>(key: string): Promise<T | null> {
    return await apiCache.get<T>(key);
  }

  private async setCachedResult<T>(
    key: string,
    data: T,
    ttl: number,
    tags: string[]
  ): Promise<void> {
    await apiCache.set(key, data, { ttl, tags, priority: 'medium' });
  }

  private async invalidateCacheForTable(table: string): Promise<void> {
    await apiCache.clearByTags([`table:${table}`]);
  }

  private async invalidateCacheByPattern(pattern: RegExp): Promise<void> {
    // Implementation would depend on cache system
    // This is a simplified version
    const entries = apiCache.exportCache();
    const keysToDelete = entries
      .filter(({ key }) => pattern.test(key))
      .map(({ key }) => key);

    keysToDelete.forEach(key => apiCache.delete(key));
  }

  // Query batching implementation
  private async executeWithBatching(
    table: string,
    query: any,
    cacheKey: string,
    priority: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const batchKey = `${table}_batch`;
      let batch = this.pendingBatches.get(batchKey);

      if (!batch) {
        batch = {
          queries: [],
          timeout: setTimeout(() => this.executeBatch(batchKey), this.config.batchTimeout),
          resolver: () => {},
          rejector: () => {}
        };
        this.pendingBatches.set(batchKey, batch);
      }

      // Add query to batch
      batch.queries.push({
        table,
        query,
        cacheKey,
        priority,
        resolve,
        reject
      });

      // Execute immediately if batch is full
      if (batch.queries.length >= this.config.maxBatchSize) {
        clearTimeout(batch.timeout);
        this.executeBatch(batchKey);
      }
    });
  }

  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch) return;

    this.pendingBatches.delete(batchKey);

    try {
      // Sort by priority (higher first)
      batch.queries.sort((a, b) => b.priority - a.priority);

      // Execute queries in parallel with rate limiting
      const results = await Promise.allSettled(
        batch.queries.map(({ query }) => query)
      );

      // Resolve individual promises
      results.forEach((result, index) => {
        const queryInfo = batch.queries[index];
        if (result.status === 'fulfilled') {
          queryInfo.resolve(result.value);
        } else {
          queryInfo.reject(result.reason);
        }
      });

    } catch (error) {
      // Reject all queries in batch
      batch.queries.forEach(({ reject }) => {
        reject(error instanceof Error ? error : new Error('Batch execution failed'));
      });
    }
  }

  // Preloading strategies
  private async preloadRelatedData<T>(
    table: string,
    data: T[],
    preloadRules: string[]
  ): Promise<void> {
    if (!Array.isArray(data) || data.length === 0) return;

    const preloadPromises = preloadRules.map(async (rule) => {
      try {
        // Parse preload rule (e.g., "products.category", "user.profile")
        const [foreignTable, field] = rule.split('.');
        const ids = data
          .map((item: any) => item[field])
          .filter((id, index, arr) => id && arr.indexOf(id) === index);

        if (ids.length > 0) {
          await this.select(foreignTable, {
            filters: { id: ids },
            cache: true,
            priority: 0 // Low priority background task
          });
        }
      } catch (error) {
        logger.error(`Preload failed for rule ${rule}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  private async preloadNextPages(
    table: string,
    baseOptions: any,
    lookahead: number
  ): Promise<void> {
    const { pageSize, page, orderBy, filters } = baseOptions;

    const preloadPromises = Array.from({ length: lookahead }, (_, i) => {
      const nextPage = page + i + 1;
      const offset = (nextPage - 1) * pageSize;

      return this.select(table, {
        filters,
        orderBy,
        limit: pageSize,
        offset,
        cache: true,
        priority: 0 // Background preloading
      });
    });

    await Promise.allSettled(preloadPromises);
  }

  // Utility methods
  private generateCacheKey(table: string, params: any): string {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    return `query:${table}:${btoa(normalized).slice(0, 20)}`;
  }

  private updateQueryHistory(key: string, duration: number): void {
    const existing = this.queryHistory.get(key);
    if (existing) {
      existing.count++;
      existing.avgDuration = (existing.avgDuration + duration) / 2;
      existing.lastUsed = Date.now();
    } else {
      this.queryHistory.set(key, {
        count: 1,
        avgDuration: duration,
        lastUsed: Date.now()
      });
    }
  }

  // Performance analytics
  getQueryStats(): Array<{ key: string; stats: any }> {
    return Array.from(this.queryHistory.entries()).map(([key, stats]) => ({
      key,
      stats
    }));
  }

  // Cleanup
  destroy(): void {
    // Clear all pending batches
    this.pendingBatches.forEach(batch => {
      clearTimeout(batch.timeout);
      batch.queries.forEach(({ reject }) => {
        reject(new Error('Query optimizer destroyed'));
      });
    });
    
    this.pendingBatches.clear();
    this.queryHistory.clear();
  }
}

// Global query optimizer instance
export const queryOptimizer = new OptimizedQueryBuilder({
  enableBatching: true,
  enableCaching: true,
  enablePagination: true,
  enablePreloading: true,
  cacheStrategy: 'adaptive'
});

// High-level query functions for common operations
export const optimizedQueries = {
  // Product operations
  getProducts: (filters: any = {}, options: any = {}) =>
    queryOptimizer.select('prices', {
      filters,
      orderBy: [{ column: 'created_at', ascending: false }],
      ...options
    }),

  getProduct: (id: string) =>
    queryOptimizer.select('prices', {
      filters: { id },
      limit: 1,
      cache: true,
      cacheTtl: 10 * 60 * 1000
    }),

  searchProducts: (searchTerm: string, options: any = {}) =>
    queryOptimizer.select('prices', {
      filters: {
        productName: { ilike: `%${searchTerm}%` }
      },
      orderBy: [{ column: 'productName', ascending: true }],
      ...options
    }),

  // Summary operations
  getDailySummary: (date: string) =>
    queryOptimizer.aggregate('prices', {
      groupBy: ['date'],
      aggregates: [
        { field: 'price', function: 'avg', alias: 'averagePrice' },
        { field: 'price', function: 'min', alias: 'minPrice' },
        { field: 'price', function: 'max', alias: 'maxPrice' },
        { field: '*', function: 'count', alias: 'count' }
      ],
      filters: { date },
      cache: true,
      cacheTtl: 60 * 60 * 1000 // 1 hour
    }),

  getMonthlySummary: (month: string) =>
    queryOptimizer.aggregate('prices', {
      groupBy: ['date'],
      aggregates: [
        { field: 'price', function: 'sum', alias: 'totalRevenue' },
        { field: '*', function: 'count', alias: 'totalItems' }
      ],
      filters: {
        date: { gte: `${month}-01`, lt: `${month}-32` }
      },
      cache: true,
      cacheTtl: 2 * 60 * 60 * 1000 // 2 hours
    }),

  // Paginated operations
  getProductsPaginated: (page: number, pageSize = 20, filters: any = {}) =>
    queryOptimizer.paginatedSelect('prices', {
      page,
      pageSize,
      orderBy: [{ column: 'created_at', ascending: false }],
      filters,
      lookahead: 2
    })
};

// React hooks for optimized queries
export function useOptimizedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any; fromCache?: boolean }>,
  dependencies: any[] = [],
  options: {
    enabled?: boolean;
    refetchOnMount?: boolean;
    refetchInterval?: number;
  } = {}
) {
  const [state, setState] = React.useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
    fromCache: boolean;
  }>({
    data: null,
    loading: false,
    error: null,
    fromCache: false
  });

  const { enabled = true, refetchOnMount = true, refetchInterval } = options;

  const executeQuery = React.useCallback(async () => {
    if (!enabled) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await queryFn();
      setState({
        data: result.data,
        loading: false,
        error: result.error ? result.error.message : null,
        fromCache: result.fromCache || false
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, dependencies);

  React.useEffect(() => {
    if (refetchOnMount) {
      executeQuery();
    }
  }, [executeQuery, refetchOnMount]);

  React.useEffect(() => {
    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(executeQuery, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [executeQuery, refetchInterval]);

  const refetch = React.useCallback(() => {
    executeQuery();
  }, [executeQuery]);

  return { ...state, refetch };
}

export default queryOptimizer;