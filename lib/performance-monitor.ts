'use client';

import { logger } from '@/lib/logger';

// Performance metrics interface
interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  domContentLoaded?: number;
  loadComplete?: number;
  jsHeapSize?: number;
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
}

interface ComponentMetrics {
  name: string;
  renderTime: number;
  updateCount: number;
  averageRenderTime: number;
  slowRenders: number;
}

interface ApiMetrics {
  endpoint: string;
  responseTime: number;
  success: boolean;
  errorCount: number;
  successRate: number;
  averageResponseTime: number;
}

// Global performance store
class PerformanceStore {
  private static instance: PerformanceStore;
  private metrics: PerformanceMetrics = {};
  private componentMetrics = new Map<string, ComponentMetrics>();
  private apiMetrics = new Map<string, ApiMetrics>();
  private observers: PerformanceObserver[] = [];
  private navigationStart = 0;

  static getInstance() {
    if (!PerformanceStore.instance) {
      PerformanceStore.instance = new PerformanceStore();
    }
    return PerformanceStore.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.navigationStart = performance.timeOrigin;
      this.initializeObservers();
      this.measureInitialMetrics();
    }
  }

  private initializeObservers() {
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
        logger.debug(`LCP: ${this.metrics.lcp}ms`);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
          logger.debug(`FID: ${this.metrics.fid}ms`);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = clsValue;
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      // Navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.ttfb = entry.responseStart - entry.requestStart;
          this.metrics.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
          this.metrics.loadComplete = entry.loadEventEnd - entry.loadEventStart;
        });
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

      // Memory usage observer
      this.observeMemoryUsage();

    } catch (error) {
      logger.error('Failed to initialize performance observers:', error);
    }
  }

  private measureInitialMetrics() {
    // First Contentful Paint
    try {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.fcp = fcpEntry.startTime;
        logger.debug(`FCP: ${this.metrics.fcp}ms`);
      }
    } catch (error) {
      logger.error('Failed to measure initial metrics:', error);
    }
  }

  private observeMemoryUsage() {
    if ('memory' in performance) {
      const updateMemoryMetrics = () => {
        const memory = (performance as any).memory;
        this.metrics.jsHeapSize = memory.jsHeapSizeLimit;
        this.metrics.usedJSHeapSize = memory.usedJSHeapSize;
        this.metrics.totalJSHeapSize = memory.totalJSHeapSize;

        // Alert if memory usage is high
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          logger.warn(`High memory usage: ${usagePercent.toFixed(1)}%`);
        }
      };

      // Update memory metrics every 30 seconds
      setInterval(updateMemoryMetrics, 30000);
      updateMemoryMetrics(); // Initial measurement
    }
  }

  // Component performance tracking
  trackComponentRender(componentName: string, renderTime: number) {
    const existing = this.componentMetrics.get(componentName) || {
      name: componentName,
      renderTime: 0,
      updateCount: 0,
      averageRenderTime: 0,
      slowRenders: 0,
    };

    existing.updateCount++;
    existing.renderTime = renderTime;
    existing.averageRenderTime = (existing.averageRenderTime * (existing.updateCount - 1) + renderTime) / existing.updateCount;
    
    if (renderTime > 16) { // 60fps threshold
      existing.slowRenders++;
    }

    this.componentMetrics.set(componentName, existing);

    // Log slow renders
    if (renderTime > 100) {
      logger.warn(`Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  // API performance tracking
  trackApiCall(endpoint: string, responseTime: number, success: boolean) {
    const existing = this.apiMetrics.get(endpoint) || {
      endpoint,
      responseTime: 0,
      success: true,
      errorCount: 0,
      successRate: 100,
      averageResponseTime: 0,
    };

    const totalCalls = (existing.averageResponseTime > 0 ? 
      Math.round(existing.averageResponseTime * 10) : 0) + 1;
    
    existing.responseTime = responseTime;
    existing.averageResponseTime = (existing.averageResponseTime * (totalCalls - 1) + responseTime) / totalCalls;
    
    if (!success) {
      existing.errorCount++;
    }
    
    existing.successRate = ((totalCalls - existing.errorCount) / totalCalls) * 100;

    this.apiMetrics.set(endpoint, existing);

    // Log slow API calls
    if (responseTime > 2000) {
      logger.warn(`Slow API call: ${endpoint} took ${responseTime.toFixed(2)}ms`);
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getComponentMetrics(): ComponentMetrics[] {
    return Array.from(this.componentMetrics.values());
  }

  getApiMetrics(): ApiMetrics[] {
    return Array.from(this.apiMetrics.values());
  }

  // Performance scoring
  getPerformanceScore(): number {
    let score = 100;

    // LCP penalty
    if (this.metrics.lcp) {
      if (this.metrics.lcp > 4000) score -= 30;
      else if (this.metrics.lcp > 2500) score -= 15;
    }

    // FID penalty
    if (this.metrics.fid) {
      if (this.metrics.fid > 300) score -= 20;
      else if (this.metrics.fid > 100) score -= 10;
    }

    // CLS penalty
    if (this.metrics.cls) {
      if (this.metrics.cls > 0.25) score -= 20;
      else if (this.metrics.cls > 0.1) score -= 10;
    }

    // Memory usage penalty
    if (this.metrics.usedJSHeapSize && this.metrics.jsHeapSize) {
      const usagePercent = (this.metrics.usedJSHeapSize / this.metrics.jsHeapSize) * 100;
      if (usagePercent > 90) score -= 15;
      else if (usagePercent > 80) score -= 8;
    }

    return Math.max(0, score);
  }

  // Generate performance report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      performanceScore: this.getPerformanceScore(),
      coreWebVitals: {
        fcp: this.metrics.fcp,
        lcp: this.metrics.lcp,
        fid: this.metrics.fid,
        cls: this.metrics.cls,
        ttfb: this.metrics.ttfb,
      },
      memoryUsage: {
        used: this.metrics.usedJSHeapSize,
        total: this.metrics.totalJSHeapSize,
        limit: this.metrics.jsHeapSize,
        usagePercent: this.metrics.usedJSHeapSize && this.metrics.jsHeapSize 
          ? (this.metrics.usedJSHeapSize / this.metrics.jsHeapSize) * 100 
          : 0,
      },
      componentPerformance: this.getComponentMetrics(),
      apiPerformance: this.getApiMetrics(),
    };

    return report;
  }

  // Send metrics to analytics service
  async sendToAnalytics() {
    if (process.env.NODE_ENV !== 'production') return;

    try {
      const report = this.generateReport();
      
      // Send to analytics endpoint
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch (error) {
      logger.error('Failed to send performance metrics:', error);
    }
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global instance
export const performanceStore = PerformanceStore.getInstance();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      performanceStore.trackComponentRender(componentName, renderTime);
    };
  });

  const trackRender = React.useCallback((startTime: number) => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    performanceStore.trackComponentRender(componentName, renderTime);
  }, [componentName]);

  return { trackRender };
}

// HOC for automatic performance monitoring
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name;

  const MonitoredComponent = React.forwardRef<any, P>((props, ref) => {
    const startTime = React.useRef(performance.now());

    React.useEffect(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;
      performanceStore.trackComponentRender(displayName, renderTime);
    });

    React.useEffect(() => {
      startTime.current = performance.now();
    });

    return <WrappedComponent {...props} ref={ref} />;
  });

  MonitoredComponent.displayName = `withPerformanceMonitoring(${displayName})`;
  return MonitoredComponent;
}

// API call monitoring wrapper
export async function withApiMonitoring<T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await apiCall();
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    performanceStore.trackApiCall(endpoint, responseTime, true);
    return result;
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    performanceStore.trackApiCall(endpoint, responseTime, false);
    throw error;
  }
}

// Performance budget checker
export class PerformanceBudget {
  private static budgets = {
    lcp: 2500, // ms
    fid: 100,  // ms
    cls: 0.1,  // score
    jsHeapUsage: 80, // percentage
    componentRender: 16, // ms (60fps)
    apiResponse: 1000, // ms
  };

  static checkBudget(): {
    passed: boolean;
    violations: string[];
    score: number;
  } {
    const violations: string[] = [];
    const metrics = performanceStore.getMetrics();
    const componentMetrics = performanceStore.getComponentMetrics();
    const apiMetrics = performanceStore.getApiMetrics();

    // Check Core Web Vitals
    if (metrics.lcp && metrics.lcp > this.budgets.lcp) {
      violations.push(`LCP: ${metrics.lcp}ms (budget: ${this.budgets.lcp}ms)`);
    }

    if (metrics.fid && metrics.fid > this.budgets.fid) {
      violations.push(`FID: ${metrics.fid}ms (budget: ${this.budgets.fid}ms)`);
    }

    if (metrics.cls && metrics.cls > this.budgets.cls) {
      violations.push(`CLS: ${metrics.cls} (budget: ${this.budgets.cls})`);
    }

    // Check memory usage
    if (metrics.usedJSHeapSize && metrics.jsHeapSize) {
      const usagePercent = (metrics.usedJSHeapSize / metrics.jsHeapSize) * 100;
      if (usagePercent > this.budgets.jsHeapUsage) {
        violations.push(`Memory usage: ${usagePercent.toFixed(1)}% (budget: ${this.budgets.jsHeapUsage}%)`);
      }
    }

    // Check component render times
    componentMetrics.forEach(component => {
      if (component.averageRenderTime > this.budgets.componentRender) {
        violations.push(`Component ${component.name}: ${component.averageRenderTime.toFixed(2)}ms (budget: ${this.budgets.componentRender}ms)`);
      }
    });

    // Check API response times
    apiMetrics.forEach(api => {
      if (api.averageResponseTime > this.budgets.apiResponse) {
        violations.push(`API ${api.endpoint}: ${api.averageResponseTime.toFixed(2)}ms (budget: ${this.budgets.apiResponse}ms)`);
      }
    });

    const score = performanceStore.getPerformanceScore();
    const passed = violations.length === 0;

    return { passed, violations, score };
  }

  static setBudget(metric: keyof typeof PerformanceBudget.budgets, value: number) {
    this.budgets[metric] = value;
  }

  static getBudgets() {
    return { ...this.budgets };
  }
}

// Performance monitoring dashboard data
export function getPerformanceDashboardData() {
  const metrics = performanceStore.getMetrics();
  const componentMetrics = performanceStore.getComponentMetrics();
  const apiMetrics = performanceStore.getApiMetrics();
  const budget = PerformanceBudget.checkBudget();

  return {
    coreWebVitals: {
      fcp: metrics.fcp,
      lcp: metrics.lcp,
      fid: metrics.fid,
      cls: metrics.cls,
      ttfb: metrics.ttfb,
    },
    memoryUsage: {
      used: metrics.usedJSHeapSize,
      total: metrics.totalJSHeapSize,
      limit: metrics.jsHeapSize,
      percentage: metrics.usedJSHeapSize && metrics.jsHeapSize 
        ? (metrics.usedJSHeapSize / metrics.jsHeapSize) * 100 
        : 0,
    },
    topSlowComponents: componentMetrics
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 5),
    topSlowApis: apiMetrics
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, 5),
    performanceScore: budget.score,
    budgetViolations: budget.violations,
    recommendations: generateRecommendations(metrics, componentMetrics, apiMetrics),
  };
}

function generateRecommendations(
  metrics: PerformanceMetrics,
  componentMetrics: ComponentMetrics[],
  apiMetrics: ApiMetrics[]
): string[] {
  const recommendations: string[] = [];

  if (metrics.lcp && metrics.lcp > 2500) {
    recommendations.push('ปรับปรุง Largest Contentful Paint โดยการลดขนาดภาพหรือใช้ lazy loading');
  }

  if (metrics.fid && metrics.fid > 100) {
    recommendations.push('ลด First Input Delay โดยการใช้ code splitting และ web workers');
  }

  if (metrics.cls && metrics.cls > 0.1) {
    recommendations.push('ลด Cumulative Layout Shift โดยการกำหนดขนาดภาพและ element ล่วงหน้า');
  }

  const slowComponents = componentMetrics.filter(c => c.averageRenderTime > 50);
  if (slowComponents.length > 0) {
    recommendations.push(`ปรับปรุงประสิทธิภาพของ component: ${slowComponents.map(c => c.name).join(', ')}`);
  }

  const slowApis = apiMetrics.filter(a => a.averageResponseTime > 1000);
  if (slowApis.length > 0) {
    recommendations.push(`ปรับปรุงประสิทธิภาพของ API: ${slowApis.map(a => a.endpoint).join(', ')}`);
  }

  if (metrics.usedJSHeapSize && metrics.jsHeapSize) {
    const usagePercent = (metrics.usedJSHeapSize / metrics.jsHeapSize) * 100;
    if (usagePercent > 80) {
      recommendations.push('ลดการใช้หน่วยความจำโดยการทำ cleanup และใช้ lazy loading');
    }
  }

  return recommendations;
}

// Auto-initialize performance monitoring
if (typeof window !== 'undefined') {
  // Send metrics to analytics periodically
  setInterval(() => {
    performanceStore.sendToAnalytics();
  }, 5 * 60 * 1000); // Every 5 minutes

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    performanceStore.cleanup();
  });
}