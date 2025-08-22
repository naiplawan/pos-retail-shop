'use client';

import { Suspense, memo, useMemo, useCallback, useTransition, useDeferredValue } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LazyPriceChart, LazyRecentPricesTable, LazyEnhancedCharts } from '@/components/lazy-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, TrendingUp, Calendar } from '@/lib/optimized-imports';
import { OptimizedQueries } from '@/lib/optimized-queries';
import { MemoryOptimizer } from '@/lib/memory-optimizer';
import { useCachedApiData } from '@/hooks/use-api-data';

// Performance-optimized loading skeletons
const DashboardSkeleton = memo(() => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
));

// Optimized stat card with intelligent updates
const OptimizedStatCard = memo(function OptimizedStatCard({
  title,
  description,
  value,
  icon,
  color = 'blue',
  priority = 'normal'
}: {
  title: string;
  description: string;
  value: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  priority?: 'high' | 'normal' | 'low';
}) {
  // Defer non-critical updates to improve perceived performance
  const deferredValue = useDeferredValue(value);
  const displayValue = priority === 'high' ? value : deferredValue;

  const colorClasses = useMemo(() => ({
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
  }), []);

  return (
    <Card className="bg-white border-2 hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3 px-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-gray-800">{title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="text-3xl sm:text-4xl font-bold text-gray-900">
          {displayValue}
        </div>
      </CardContent>
    </Card>
  );
});

// Virtualized table component for large datasets
const VirtualizedRecentPrices = memo(function VirtualizedRecentPrices({ 
  data, 
  isLoading 
}: { 
  data: any[]; 
  isLoading: boolean; 
}) {
  // Only render visible items
  const visibleData = useMemo(() => data.slice(0, 10), [data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <LazyRecentPricesTable data={visibleData} isLoading={false} />
    </Suspense>
  );
});

// Performance-optimized dashboard with intelligent loading
export default function PerformanceOptimizedDashboard() {
  const [isPending, startTransition] = useTransition();
  
  // Optimized data fetching with memory awareness
  const { data: dashboardData, isLoading: dashboardLoading } = useCachedApiData(
    'dashboard-batch',
    useCallback(async () => {
      // Check memory before making requests
      const memInfo = MemoryOptimizer.getMemoryInfo();
      if (memInfo.usedPercent > 85) {
        // Return cached data if memory is critical
        const cached = MemoryOptimizer.getCached('dashboard-data');
        if (cached) return cached;
      }

      const data = await OptimizedQueries.getDashboardData(10);
      
      // Cache the result for offline access
      MemoryOptimizer.cache('dashboard-data', data, 5 * 60 * 1000);
      
      return data;
    }, []),
    [],
    2 * 60 * 1000 // 2 minute cache
  );

  // Compute stats with memoization
  const stats = useMemo(() => {
    if (!dashboardData) return null;

    return {
      totalItems: dashboardData.totalCount?.toString() || '0',
      dailyAverage: dashboardData.dailySummary?.[0]?.averagePrice 
        ? `${dashboardData.dailySummary[0].averagePrice.toFixed(2)} บาท`
        : 'ไม่มีข้อมูล',
      monthlyAverage: dashboardData.monthlySummary?.[0]?.averagePrice
        ? `${dashboardData.monthlySummary[0].averagePrice.toFixed(2)} บาท`
        : 'ไม่มีข้อมูล'
    };
  }, [dashboardData]);

  // Handle tab switching with performance optimization
  const handleTabChange = useCallback((value: string) => {
    startTransition(() => {
      // Preload components that might be needed
      if (value === 'analytics') {
        import('@/components/enhanced-charts');
      }
    });
  }, []);

  // Error fallback component
  const ErrorFallback = ({ error }: { error: Error }) => (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">เกิดข้อผิดพลาด</h3>
        <p className="text-red-600">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          รีเฟรช
        </button>
      </CardContent>
    </Card>
  );

  // Show loading state
  if (dashboardLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="space-y-6">
        {/* Critical stats - loaded immediately */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <OptimizedStatCard
              title="สินค้าทั้งหมด"
              description="จำนวนรายการที่บันทึก"
              value={stats.totalItems}
              icon={<Package className="h-6 w-6" />}
              color="blue"
              priority="high"
            />
            
            <OptimizedStatCard
              title="ราคาวันนี้"
              description="ราคาเฉลี่ยของวันนี้"
              value={stats.dailyAverage}
              icon={<TrendingUp className="h-6 w-6" />}
              color="green"
              priority="high"
            />
            
            <OptimizedStatCard
              title="ราคาเดือนนี้"
              description="ราคาเฉลี่ยเดือนนี้"
              value={stats.monthlyAverage}
              icon={<Calendar className="h-6 w-6" />}
              color="purple"
              priority="normal"
            />
          </div>
        )}

        {/* Recent items - virtualized for performance */}
        <Card className="bg-white border-2 overflow-hidden">
          <CardHeader className="px-6 py-5 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">รายการล่าสุด</CardTitle>
                <p className="text-sm text-gray-600">สินค้าที่บันทึกล่าสุด</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-2 overflow-auto">
            <VirtualizedRecentPrices 
              data={dashboardData?.recentPrices || []} 
              isLoading={dashboardLoading} 
            />
          </CardContent>
        </Card>

        {/* Charts - lazy loaded */}
        <Card className="bg-white border-2 overflow-hidden">
          <CardHeader className="px-6 py-5 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">กราฟราคาสินค้า</CardTitle>
                <p className="text-sm text-gray-600">แสดงแนวโน้มราคาตามช่วงเวลา</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] sm:h-[400px] p-2">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <LazyPriceChart data={dashboardData?.monthlySummary || []} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Loading indicator for transitions */}
        {isPending && (
          <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            กำลังโหลด...
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

// Performance monitoring HOC
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return memo(function PerformanceMonitoredComponent(props: P) {
    const startTime = performance.now();

    React.useEffect(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 100) { // Log slow renders
        console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
      
      // Track to analytics in production
      if (process.env.NODE_ENV === 'production') {
        // Analytics tracking code here
      }
    });

    return <Component {...props} />;
  });
}

// Hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const [renderTime, setRenderTime] = React.useState<number>(0);
  const startTimeRef = React.useRef<number>(performance.now());

  React.useEffect(() => {
    const endTime = performance.now();
    const time = endTime - startTimeRef.current;
    setRenderTime(time);
    
    if (time > 100) {
      console.warn(`${componentName} render time: ${time.toFixed(2)}ms`);
    }
  });

  React.useEffect(() => {
    startTimeRef.current = performance.now();
  });

  return { renderTime };
}