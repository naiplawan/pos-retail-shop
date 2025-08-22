import { supabaseServer } from '@/lib/supabase-server';
import { supabase } from '@/lib/supabase';
import type { PriceData, DailySummaryData, MonthlySummaryData } from '@/types';
import { logger } from '@/lib/logger';

// Query optimization strategies for POS system
export class OptimizedQueries {
  
  // Batch multiple queries into a single request
  static async getDashboardData(limit = 10) {
    try {
      const startTime = performance.now();
      
      // Use Promise.all for parallel execution instead of sequential
      const [
        recentPrices,
        dailySummary,
        monthlySummary,
        totalCount
      ] = await Promise.all([
        // Recent prices with limit
        supabaseServer
          .from('prices')
          .select('id, product_name, price, date')
          .order('date', { ascending: false })
          .limit(limit),
        
        // Daily summary with aggregation
        supabaseServer
          .from('prices')
          .select('date, price')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: false }),
        
        // Monthly summary with aggregation
        supabaseServer
          .from('prices')
          .select('date, price')
          .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .order('date', { ascending: false }),
        
        // Total count for statistics
        supabaseServer
          .from('prices')
          .select('id', { count: 'exact', head: true })
      ]);

      const endTime = performance.now();
      logger.debug(`Batch query completed in ${endTime - startTime}ms`);

      return {
        recentPrices: recentPrices.data || [],
        dailySummary: this.aggregateDailyData(dailySummary.data || []),
        monthlySummary: this.aggregateMonthlyData(monthlySummary.data || []),
        totalCount: totalCount.count || 0,
        queryTime: endTime - startTime
      };
    } catch (error) {
      logger.error('Batch query failed:', error);
      throw error;
    }
  }

  // Optimized search with proper indexing
  static async searchProducts(query: string, filters: {
    dateFrom?: string;
    dateTo?: string;
    priceMin?: number;
    priceMax?: number;
    limit?: number;
  } = {}) {
    try {
      let dbQuery = supabaseServer
        .from('prices')
        .select('id, product_name, price, date');

      // Full-text search on product name (requires database index)
      if (query) {
        dbQuery = dbQuery.textSearch('product_name', query);
      }

      // Date range filtering
      if (filters.dateFrom) {
        dbQuery = dbQuery.gte('date', filters.dateFrom);
      }
      if (filters.dateTo) {
        dbQuery = dbQuery.lte('date', filters.dateTo);
      }

      // Price range filtering
      if (filters.priceMin) {
        dbQuery = dbQuery.gte('price', filters.priceMin);
      }
      if (filters.priceMax) {
        dbQuery = dbQuery.lte('price', filters.priceMax);
      }

      // Pagination
      dbQuery = dbQuery
        .order('date', { ascending: false })
        .limit(filters.limit || 50);

      const { data, error } = await dbQuery;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Search query failed:', error);
      throw error;
    }
  }

  // Cached aggregation queries
  static async getCachedSummary(cacheKey: string, queryFn: () => Promise<any>, ttl = 300000) {
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await queryFn();
    this.setCache(cacheKey, result, ttl);
    return result;
  }

  // Efficient pagination with cursor-based approach
  static async getPaginatedPrices(cursor?: string, limit = 20) {
    try {
      let query = supabaseServer
        .from('prices')
        .select('id, product_name, price, date')
        .order('date', { ascending: false })
        .limit(limit);

      if (cursor) {
        query = query.lt('date', cursor);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const nextCursor = data && data.length === limit ? data[data.length - 1].date : null;
      
      return {
        data: data || [],
        nextCursor,
        hasMore: data && data.length === limit
      };
    } catch (error) {
      logger.error('Pagination query failed:', error);
      throw error;
    }
  }

  // Bulk operations for better performance
  static async bulkInsertPrices(prices: Array<{
    product_name: string;
    price: number;
    date: string;
  }>) {
    try {
      const startTime = performance.now();
      
      // Use batch insert with proper error handling
      const { data, error } = await supabaseServer
        .from('prices')
        .insert(prices)
        .select();

      if (error) throw error;

      const endTime = performance.now();
      logger.debug(`Bulk insert of ${prices.length} records completed in ${endTime - startTime}ms`);

      // Invalidate related caches
      this.invalidateCache(['dashboard-data', 'recent-prices', 'daily-summary']);

      return data;
    } catch (error) {
      logger.error('Bulk insert failed:', error);
      throw error;
    }
  }

  // Optimized aggregation functions
  private static aggregateDailyData(data: Array<{ date: string; price: number }>): DailySummaryData[] {
    const grouped = data.reduce((acc, item) => {
      const date = item.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = { prices: [], count: 0 };
      }
      acc[date].prices.push(item.price);
      acc[date].count++;
      return acc;
    }, {} as Record<string, { prices: number[]; count: number }>);

    return Object.entries(grouped).map(([date, { prices, count }]) => ({
      date,
      averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      totalItems: count,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices)
    }));
  }

  private static aggregateMonthlyData(data: Array<{ date: string; price: number }>): MonthlySummaryData[] {
    const grouped = data.reduce((acc, item) => {
      const month = item.date.substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { prices: [], count: 0 };
      }
      acc[month].prices.push(item.price);
      acc[month].count++;
      return acc;
    }, {} as Record<string, { prices: number[]; count: number }>);

    return Object.entries(grouped).map(([month, { prices, count }]) => ({
      month,
      averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      totalItems: count,
      totalRevenue: prices.reduce((sum, price) => sum + price, 0)
    }));
  }

  // Simple in-memory cache for development (use Redis in production)
  private static cache = new Map<string, { data: any; expiry: number }>();

  private static getFromCache(key: string) {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCache(key: string, data: any, ttl: number) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  private static invalidateCache(keys: string[]) {
    keys.forEach(key => this.cache.delete(key));
  }
}

// Database optimization recommendations for Supabase
export const databaseOptimizations = {
  // Recommended indexes for better query performance
  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_prices_date ON prices(date DESC);',
    'CREATE INDEX IF NOT EXISTS idx_prices_product_name ON prices(product_name);',
    'CREATE INDEX IF NOT EXISTS idx_prices_price ON prices(price);',
    'CREATE INDEX IF NOT EXISTS idx_prices_date_product ON prices(date DESC, product_name);',
    // Full-text search index
    'CREATE INDEX IF NOT EXISTS idx_prices_product_name_fts ON prices USING gin(to_tsvector(\'english\', product_name));'
  ],

  // Row Level Security policies for performance
  policies: [
    'ALTER TABLE prices ENABLE ROW LEVEL SECURITY;',
    'CREATE POLICY "Enable read access for all users" ON prices FOR SELECT USING (true);',
    'CREATE POLICY "Enable insert for authenticated users only" ON prices FOR INSERT WITH CHECK (auth.role() = \'authenticated\');'
  ],

  // Maintenance queries for optimal performance
  maintenance: [
    'VACUUM ANALYZE prices;', // Update table statistics
    'REINDEX TABLE prices;', // Rebuild indexes
  ]
};

// Real-time subscription optimization
export class RealtimeOptimizer {
  private static subscriptions = new Map<string, any>();

  static subscribeToChanges(table: string, callback: (payload: any) => void) {
    // Avoid duplicate subscriptions
    if (this.subscriptions.has(table)) {
      return this.subscriptions.get(table);
    }

    const subscription = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        callback
      )
      .subscribe();

    this.subscriptions.set(table, subscription);
    return subscription;
  }

  static unsubscribeAll() {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }
}

// Query performance monitoring
export const queryMonitor = {
  trackQueryPerformance: (queryName: string, startTime: number) => {
    const duration = performance.now() - startTime;
    if (duration > 1000) { // Log slow queries (>1s)
      logger.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
    }
    return duration;
  },

  logQueryStats: (queryName: string, resultCount: number, duration: number) => {
    logger.debug(`Query: ${queryName}, Results: ${resultCount}, Duration: ${duration.toFixed(2)}ms`);
  }
};