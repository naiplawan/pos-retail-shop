import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Client-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
}

// Enhanced client configuration with connection pooling
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-client-info': 'pos-retail-shop@1.0.0',
    },
  },
});

// Separate client for connection pooling (use for API routes)
export const supabasePooled = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-client-info': 'pos-retail-shop-pooled@1.0.0',
      },
    },
  }
);

// Connection health monitoring
class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private healthCheckInterval?: NodeJS.Timeout;
  private isHealthy = true;
  private lastCheckTime = 0;
  private consecutiveFailures = 0;

  static getInstance() {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  startMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const startTime = performance.now();
        const { data, error } = await supabase
          .from('prices')
          .select('id')
          .limit(1);
        
        const responseTime = performance.now() - startTime;
        
        if (error) {
          this.consecutiveFailures++;
          this.isHealthy = false;
          logger.error('Database health check failed:', error);
        } else {
          this.consecutiveFailures = 0;
          this.isHealthy = true;
          this.lastCheckTime = Date.now();
          
          // Log slow responses
          if (responseTime > 2000) {
            logger.warn(`Slow database response: ${responseTime.toFixed(2)}ms`);
          }
        }
      } catch (error) {
        this.consecutiveFailures++;
        this.isHealthy = false;
        logger.error('Database connection failed:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  getHealth() {
    return {
      isHealthy: this.isHealthy,
      lastCheckTime: this.lastCheckTime,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  // Force a health check
  async checkHealth() {
    try {
      const { error } = await supabase
        .from('prices')
        .select('id')
        .limit(1);
      
      this.isHealthy = !error;
      this.lastCheckTime = Date.now();
      
      if (error) {
        this.consecutiveFailures++;
      } else {
        this.consecutiveFailures = 0;
      }
      
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.consecutiveFailures++;
      return false;
    }
  }
}

export const connectionMonitor = ConnectionMonitor.getInstance();

// Initialize monitoring in browser
if (typeof window !== 'undefined') {
  connectionMonitor.startMonitoring();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    connectionMonitor.stopMonitoring();
  });
}

// Query performance tracking
export class QueryPerformanceTracker {
  private static queryStats = new Map<string, {
    totalTime: number;
    count: number;
    slowestQuery: number;
    averageTime: number;
  }>();

  static trackQuery<T>(queryName: string, queryPromise: Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    return queryPromise.then((result) => {
      const duration = performance.now() - startTime;
      this.recordQueryTime(queryName, duration);
      
      if (duration > 1000) {
        logger.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    }).catch((error) => {
      const duration = performance.now() - startTime;
      this.recordQueryTime(queryName, duration);
      logger.error(`Query failed: ${queryName} after ${duration.toFixed(2)}ms`, error);
      throw error;
    });
  }

  private static recordQueryTime(queryName: string, duration: number) {
    const existing = this.queryStats.get(queryName) || {
      totalTime: 0,
      count: 0,
      slowestQuery: 0,
      averageTime: 0,
    };

    existing.totalTime += duration;
    existing.count++;
    existing.slowestQuery = Math.max(existing.slowestQuery, duration);
    existing.averageTime = existing.totalTime / existing.count;

    this.queryStats.set(queryName, existing);
  }

  static getStats() {
    return Object.fromEntries(this.queryStats.entries());
  }

  static clearStats() {
    this.queryStats.clear();
  }
}

export { supabase };
export default supabase;