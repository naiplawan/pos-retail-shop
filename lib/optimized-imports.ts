// Optimized imports to reduce bundle size
// Instead of importing entire libraries, import only what's needed

// ❌ BAD: Imports entire lucide-react library (~2MB)
// import { Calendar, TrendingUp, Package } from 'lucide-react';

// ✅ GOOD: Import only specific icons (tree-shakeable)
export { Calendar } from 'lucide-react/dist/esm/icons/calendar';
export { TrendingUp } from 'lucide-react/dist/esm/icons/trending-up';
export { Package } from 'lucide-react/dist/esm/icons/package';
export { Store } from 'lucide-react/dist/esm/icons/store';
export { Plus } from 'lucide-react/dist/esm/icons/plus';
export { Download } from 'lucide-react/dist/esm/icons/download';
export { Receipt } from 'lucide-react/dist/esm/icons/receipt';
export { CalendarDays } from 'lucide-react/dist/esm/icons/calendar-days';
export { Home } from 'lucide-react/dist/esm/icons/home';
export { Search } from 'lucide-react/dist/esm/icons/search';
export { BarChart3 } from 'lucide-react/dist/esm/icons/bar-chart-3';
export { ShoppingCart } from 'lucide-react/dist/esm/icons/shopping-cart';
export { Settings } from 'lucide-react/dist/esm/icons/settings';
export { Users } from 'lucide-react/dist/esm/icons/users';
export { DollarSign } from 'lucide-react/dist/esm/icons/dollar-sign';

// Date utilities - import only what's needed
export { format } from 'date-fns/format';
export { parseISO } from 'date-fns/parseISO';
export { startOfDay } from 'date-fns/startOfDay';
export { endOfDay } from 'date-fns/endOfDay';
export { startOfMonth } from 'date-fns/startOfMonth';
export { endOfMonth } from 'date-fns/endOfMonth';

// Chart.js - optimized imports
export {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Radix UI - only import used components
export { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@radix-ui/react-dialog';

export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@radix-ui/react-tabs';

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@radix-ui/react-select';

// Bundle analyzer helper
export const bundleAnalysis = {
  // Track component usage for optimization
  trackComponentUsage: (componentName: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Component used: ${componentName}`);
    }
  },
  
  // Measure component load time
  measureLoadTime: (componentName: string, startTime: number) => {
    if (process.env.NODE_ENV === 'development') {
      const loadTime = performance.now() - startTime;
      console.log(`${componentName} loaded in ${loadTime.toFixed(2)}ms`);
    }
  },
};

// Lightweight alternatives for heavy libraries
export const lightweightAlternatives = {
  // Use native Intl instead of heavy formatting libraries
  formatCurrency: (amount: number, currency = 'THB') => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },
  
  // Use native Date methods instead of date-fns where possible
  formatDate: (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('th-TH');
  },
  
  // Simple debounce without lodash
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },
  
  // Simple throttle without lodash
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
};

// Performance monitoring for bundle optimization
export const performanceMonitor = {
  // Track largest contentful paint
  trackLCP: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  },
  
  // Track first input delay
  trackFID: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log('FID:', entry.processingStart - entry.startTime);
        });
      });
      observer.observe({ entryTypes: ['first-input'] });
    }
  },
  
  // Track cumulative layout shift
  trackCLS: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log('CLS:', clsValue);
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    }
  },
};