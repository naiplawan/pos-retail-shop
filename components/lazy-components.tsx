'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Loading components for better UX
const ChartSkeleton = () => (
  <Card className="w-full">
    <CardHeader>
      <Skeleton className="h-6 w-32" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full" />
    </CardContent>
  </Card>
);

const TableSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
  </div>
);

const FormSkeleton = () => (
  <Card className="w-full">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-24" />
    </CardContent>
  </Card>
);

// Heavy components - lazy loaded only when needed
export const LazyPriceChart = dynamic(
  () => import('@/components/price-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Disable SSR for chart components (client-side only)
  }
);

export const LazyEnhancedCharts = dynamic(
  () => import('@/components/enhanced-charts'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

export const LazyRecentPricesTable = dynamic(
  () => import('@/components/recent-prices-table'),
  {
    loading: () => <TableSkeleton />,
  }
);

export const LazyPriceForm = dynamic(
  () => import('@/components/price-form'),
  {
    loading: () => <FormSkeleton />,
  }
);

export const LazyDailySummary = dynamic(
  () => import('@/components/daily-summary'),
  {
    loading: () => <ChartSkeleton />,
  }
);

export const LazyMonthlySummary = dynamic(
  () => import('@/components/monthly-summary'),
  {
    loading: () => <ChartSkeleton />,
  }
);

export const LazyExportOptions = dynamic(
  () => import('@/components/export-options'),
  {
    loading: () => <FormSkeleton />,
    ssr: false, // PDF generation is client-side only
  }
);

// Advanced lazy loading for modals and heavy features
export const LazyInventoryManager = dynamic(
  () => import('@/components/inventory-manager'),
  {
    loading: () => <TableSkeleton />,
  }
);

export const LazyPrintSystem = dynamic(
  () => import('@/components/print-system'),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
);

export const LazyAdvancedSearch = dynamic(
  () => import('@/components/advanced-search'),
  {
    loading: () => <FormSkeleton />,
  }
);

// Barcode scanner - only load on demand
export const LazyBarcodeScanner = dynamic(
  () => import('@/components/barcode-scanner'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-32 w-32 rounded-lg" />
      </div>
    ),
    ssr: false, // Camera access is client-side only
  }
);

// Analytics dashboard - load on tab switch
export const LazyAnalyticsDashboard = dynamic(
  () => import('@/components/analytics-dashboard'),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    ),
    ssr: false,
  }
);

// Utility for preloading critical components
export const preloadCriticalComponents = () => {
  // Preload components that will likely be used soon
  const criticalComponents = [
    () => import('@/components/price-form'),
    () => import('@/components/recent-prices-table'),
  ];
  
  criticalComponents.forEach(component => {
    component().catch(() => {
      // Silently handle preload errors
    });
  });
};

// Advanced lazy loading with priority and memory management
export const LazyProductForm = dynamic(
  () => import('@/components/product-form'),
  {
    loading: () => <FormSkeleton />,
  }
);

export const LazyBarcodeInput = dynamic(
  () => import('@/components/barcode-input'),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
);

export const LazyKeyboardShortcuts = dynamic(
  () => import('@/components/keyboard-shortcuts'),
  {
    loading: () => <div>Loading shortcuts...</div>,
    ssr: false,
  }
);

export const LazyNotificationSystem = dynamic(
  () => import('@/components/notification-system'),
  {
    loading: () => <div>Loading notifications...</div>,
    ssr: false,
  }
);

// Route-based code splitting for better performance
export const LazyChecklistPage = dynamic(
  () => import('@/app/checklist/page'),
  {
    loading: () => <div className="animate-pulse p-8">Loading checklist...</div>,
  }
);

// Heavy calculation components
export const LazyAdvancedAnalytics = dynamic(
  () => import('@/components/advanced-analytics'),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    ),
    ssr: false,
  }
);

// Hook for intelligent component preloading with intersection observer
export const useComponentPreloader = () => {
  const [preloadedComponents, setPreloadedComponents] = React.useState<Set<string>>(new Set());
  
  const preloadComponent = useCallback((importFunc: () => Promise<any>, componentName: string) => {
    if (preloadedComponents.has(componentName)) return;
    
    importFunc().then(() => {
      setPreloadedComponents(prev => new Set(prev).add(componentName));
    }).catch(() => {
      // Silently handle preload errors
    });
  }, [preloadedComponents]);
  
  // Preload based on user interaction patterns
  const preloadOnHover = useCallback((importFunc: () => Promise<any>, componentName: string) => {
    return () => preloadComponent(importFunc, componentName);
  }, [preloadComponent]);
  
  // Preload based on viewport visibility
  const preloadOnVisible = useCallback((importFunc: () => Promise<any>, componentName: string, element: HTMLElement | null) => {
    if (!element || preloadedComponents.has(componentName)) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          preloadComponent(importFunc, componentName);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [preloadComponent, preloadedComponents]);
  
  return { preloadComponent, preloadOnHover, preloadOnVisible };
};

// Bundle splitting utility
export const bundleSplitter = {
  // Core components that should be loaded immediately
  core: [
    () => import('@/components/ui/button'),
    () => import('@/components/ui/card'),
    () => import('@/components/ui/input'),
  ],
  
  // Secondary components loaded on interaction
  secondary: [
    () => import('@/components/price-form'),
    () => import('@/components/recent-prices-table'),
  ],
  
  // Heavy components loaded on demand
  heavy: [
    () => import('@/components/enhanced-charts'),
    () => import('@/components/inventory-manager'),
    () => import('@/components/print-system'),
  ],
  
  // Preload strategy
  preloadStrategy: (priority: 'core' | 'secondary' | 'heavy') => {
    const components = bundleSplitter[priority];
    components.forEach(component => {
      requestIdleCallback(() => {
        component().catch(() => {});
      });
    });
  },
};