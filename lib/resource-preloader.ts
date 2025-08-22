'use client';

import { logger } from '@/lib/logger';

// Resource types for preloading
interface PreloadResource {
  href: string;
  as: 'script' | 'style' | 'font' | 'image' | 'fetch' | 'document' | 'audio' | 'video';
  type?: string;
  crossorigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  media?: string;
  sizes?: string;
  priority?: 'high' | 'low' | 'auto';
  fetchpriority?: 'high' | 'low' | 'auto';
}

interface PreloadState {
  href: string;
  status: 'pending' | 'loaded' | 'error';
  startTime: number;
  endTime?: number;
  element?: HTMLLinkElement;
}

// Resource priority levels
enum ResourcePriority {
  CRITICAL = 'critical',      // Must load before any interaction
  IMPORTANT = 'important',    // Should load early
  NORMAL = 'normal',         // Can load in background
  LOW = 'low'               // Load when idle
}

interface ResourceConfig {
  url: string;
  priority: ResourcePriority;
  condition?: () => boolean;
  preloadAs?: PreloadResource['as'];
  prefetch?: boolean;
  modulePreload?: boolean;
}

// Critical resources that should be preloaded immediately
const CRITICAL_RESOURCES: ResourceConfig[] = [
  // Core application bundle
  {
    url: '/_next/static/js/app.js',
    priority: ResourcePriority.CRITICAL,
    preloadAs: 'script'
  },
  
  // Main CSS file
  {
    url: '/_next/static/css/app.css',
    priority: ResourcePriority.CRITICAL,
    preloadAs: 'style'
  },
  
  // Critical fonts
  {
    url: '/fonts/inter-variable.woff2',
    priority: ResourcePriority.CRITICAL,
    preloadAs: 'font',
    condition: () => true
  },
  
  // API endpoints that are likely to be called
  {
    url: '/api/prices?limit=10',
    priority: ResourcePriority.IMPORTANT,
    preloadAs: 'fetch',
    condition: () => window.location.pathname === '/'
  }
];

// Secondary resources for route-based preloading
const ROUTE_RESOURCES: Record<string, ResourceConfig[]> = {
  '/': [
    {
      url: '/api/summary/all',
      priority: ResourcePriority.IMPORTANT,
      preloadAs: 'fetch'
    },
    {
      url: '/_next/static/chunks/dashboard.js',
      priority: ResourcePriority.NORMAL,
      preloadAs: 'script'
    }
  ],
  
  '/checklist': [
    {
      url: '/api/checklist',
      priority: ResourcePriority.IMPORTANT,
      preloadAs: 'fetch'
    },
    {
      url: '/_next/static/chunks/checklist.js',
      priority: ResourcePriority.NORMAL,
      preloadAs: 'script'
    }
  ]
};

// Component-based resources
const COMPONENT_RESOURCES: Record<string, ResourceConfig[]> = {
  'PriceChart': [
    {
      url: '/_next/static/chunks/chartjs.js',
      priority: ResourcePriority.NORMAL,
      preloadAs: 'script'
    }
  ],
  
  'InventoryManager': [
    {
      url: '/api/inventory',
      priority: ResourcePriority.NORMAL,
      preloadAs: 'fetch'
    }
  ],
  
  'PrintSystem': [
    {
      url: '/_next/static/chunks/jspdf.js',
      priority: ResourcePriority.LOW,
      preloadAs: 'script'
    }
  ]
};

class ResourcePreloader {
  private static instance: ResourcePreloader;
  private preloadStates = new Map<string, PreloadState>();
  private intersectionObserver?: IntersectionObserver;
  private preloadedRoutes = new Set<string>();
  private preloadedComponents = new Set<string>();

  static getInstance() {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializePreloading();
      this.setupIntersectionObserver();
      this.setupRoutePreloading();
    }
  }

  // Initialize critical resource preloading
  private initializePreloading() {
    // Preload critical resources immediately
    requestIdleCallback(() => {
      this.preloadCriticalResources();
    });

    // Preload route-specific resources
    this.preloadRouteResources(window.location.pathname);

    // Setup predictive preloading
    this.setupPredictivePreloading();
  }

  // Preload critical resources that are needed immediately
  async preloadCriticalResources() {
    const criticalTasks = CRITICAL_RESOURCES
      .filter(resource => !resource.condition || resource.condition())
      .map(resource => this.preloadResource({
        href: resource.url,
        as: resource.preloadAs || 'fetch',
        fetchpriority: 'high'
      }));

    try {
      await Promise.allSettled(criticalTasks);
      logger.info('Critical resources preloaded');
    } catch (error) {
      logger.error('Failed to preload critical resources:', error);
    }
  }

  // Preload resources for specific routes
  preloadRouteResources(route: string) {
    if (this.preloadedRoutes.has(route)) return;

    const routeResources = ROUTE_RESOURCES[route] || [];
    
    routeResources.forEach(resource => {
      if (!resource.condition || resource.condition()) {
        this.preloadResource({
          href: resource.url,
          as: resource.preloadAs || 'fetch',
          fetchpriority: resource.priority === ResourcePriority.CRITICAL ? 'high' : 'auto'
        });
      }
    });

    this.preloadedRoutes.add(route);
  }

  // Preload resources for specific components
  preloadComponentResources(componentName: string) {
    if (this.preloadedComponents.has(componentName)) return;

    const componentResources = COMPONENT_RESOURCES[componentName] || [];
    
    componentResources.forEach(resource => {
      const priority = resource.priority === ResourcePriority.CRITICAL ? 'high' : 'auto';
      
      if (resource.modulePreload) {
        this.modulePreload(resource.url);
      } else {
        this.preloadResource({
          href: resource.url,
          as: resource.preloadAs || 'script',
          fetchpriority: priority
        });
      }
    });

    this.preloadedComponents.add(componentName);
  }

  // Core preload functionality
  private async preloadResource(resource: PreloadResource): Promise<void> {
    if (this.preloadStates.has(resource.href)) {
      return; // Already preloaded or in progress
    }

    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      
      // Create preload link element
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      
      if (resource.type) link.type = resource.type;
      if (resource.crossorigin) link.crossOrigin = resource.crossorigin;
      if (resource.integrity) link.integrity = resource.integrity;
      if (resource.media) link.media = resource.media;
      if (resource.sizes) link.sizes = resource.sizes;
      if (resource.fetchpriority) link.setAttribute('fetchpriority', resource.fetchpriority);

      // Track loading state
      const state: PreloadState = {
        href: resource.href,
        status: 'pending',
        startTime,
        element: link
      };
      
      this.preloadStates.set(resource.href, state);

      // Handle load success
      link.onload = () => {
        const endTime = performance.now();
        state.status = 'loaded';
        state.endTime = endTime;
        
        logger.debug(`Preloaded ${resource.href} in ${(endTime - startTime).toFixed(2)}ms`);
        resolve();
      };

      // Handle load error
      link.onerror = () => {
        state.status = 'error';
        state.endTime = performance.now();
        
        logger.warn(`Failed to preload ${resource.href}`);
        reject(new Error(`Failed to preload ${resource.href}`));
      };

      // Add to document head
      document.head.appendChild(link);
    });
  }

  // Module preloading for ES modules
  private modulePreload(url: string) {
    if (this.preloadStates.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = url;
    
    const state: PreloadState = {
      href: url,
      status: 'pending',
      startTime: performance.now(),
      element: link
    };
    
    this.preloadStates.set(url, state);

    link.onload = () => {
      state.status = 'loaded';
      state.endTime = performance.now();
      logger.debug(`Module preloaded: ${url}`);
    };

    link.onerror = () => {
      state.status = 'error';
      state.endTime = performance.now();
      logger.warn(`Failed to module preload: ${url}`);
    };

    document.head.appendChild(link);
  }

  // Prefetch resources for future navigation
  prefetchResource(url: string, priority: 'high' | 'low' = 'low') {
    if (this.preloadStates.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.setAttribute('fetchpriority', priority);
    
    const state: PreloadState = {
      href: url,
      status: 'pending',
      startTime: performance.now(),
      element: link
    };
    
    this.preloadStates.set(url, state);

    link.onload = () => {
      state.status = 'loaded';
      state.endTime = performance.now();
      logger.debug(`Prefetched: ${url}`);
    };

    link.onerror = () => {
      state.status = 'error';
      state.endTime = performance.now();
      logger.warn(`Failed to prefetch: ${url}`);
    };

    document.head.appendChild(link);
  }

  // Setup intersection observer for viewport-based preloading
  private setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const preloadUrls = element.dataset.preload?.split(',') || [];
            
            preloadUrls.forEach(url => {
              this.preloadResource({
                href: url.trim(),
                as: 'fetch',
                fetchpriority: 'auto'
              });
            });

            // Stop observing once preloaded
            this.intersectionObserver?.unobserve(element);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );
  }

  // Observe element for viewport-based preloading
  observeElement(element: HTMLElement, urls: string[]) {
    if (!this.intersectionObserver) return;

    element.dataset.preload = urls.join(',');
    this.intersectionObserver.observe(element);
  }

  // Setup route preloading based on user behavior
  private setupRoutePreloading() {
    // Preload likely next routes on link hover
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.href) {
        const url = new URL(link.href);
        if (url.origin === window.location.origin) {
          this.preloadRouteResources(url.pathname);
          this.prefetchResource(url.pathname, 'low');
        }
      }
    });

    // Preload on focus for keyboard navigation
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.href) {
        const url = new URL(link.href);
        if (url.origin === window.location.origin) {
          this.preloadRouteResources(url.pathname);
        }
      }
    });
  }

  // Setup predictive preloading based on user patterns
  private setupPredictivePreloading() {
    // Track user navigation patterns
    const navigationHistory: string[] = [];
    
    // Store current route
    const updateNavigationHistory = () => {
      navigationHistory.push(window.location.pathname);
      
      // Keep only last 5 routes
      if (navigationHistory.length > 5) {
        navigationHistory.shift();
      }
      
      // Predict next likely route based on patterns
      this.predictAndPreloadNextRoute(navigationHistory);
    };

    // Listen for route changes
    window.addEventListener('popstate', updateNavigationHistory);
    
    // Initial recording
    updateNavigationHistory();
  }

  // Predict next route based on navigation patterns
  private predictAndPreloadNextRoute(history: string[]) {
    // Simple prediction: if user often goes from A to B, preload B when on A
    const patterns: Record<string, string[]> = {
      '/': ['/checklist', '/api/summary/all'],
      '/checklist': ['/api/checklist/items', '/_next/static/chunks/checklist-details.js']
    };

    const currentRoute = history[history.length - 1];
    const likelyNextRoutes = patterns[currentRoute] || [];

    likelyNextRoutes.forEach(route => {
      if (route.startsWith('/api/')) {
        this.prefetchResource(route, 'low');
      } else if (route.startsWith('/_next/')) {
        this.modulePreload(route);
      } else {
        this.preloadRouteResources(route);
      }
    });
  }

  // Get preloading statistics
  getPreloadStats() {
    const states = Array.from(this.preloadStates.values());
    
    return {
      total: states.length,
      loaded: states.filter(s => s.status === 'loaded').length,
      pending: states.filter(s => s.status === 'pending').length,
      errors: states.filter(s => s.status === 'error').length,
      averageLoadTime: this.calculateAverageLoadTime(states),
      preloadedRoutes: Array.from(this.preloadedRoutes),
      preloadedComponents: Array.from(this.preloadedComponents)
    };
  }

  private calculateAverageLoadTime(states: PreloadState[]): number {
    const completedStates = states.filter(s => s.endTime && s.status === 'loaded');
    if (completedStates.length === 0) return 0;

    const totalTime = completedStates.reduce(
      (sum, state) => sum + (state.endTime! - state.startTime), 
      0
    );
    
    return totalTime / completedStates.length;
  }

  // Cleanup preload links to free memory
  cleanup() {
    this.preloadStates.forEach(state => {
      if (state.element && state.element.parentNode) {
        state.element.parentNode.removeChild(state.element);
      }
    });
    
    this.preloadStates.clear();
    this.intersectionObserver?.disconnect();
  }
}

// Global instance
export const resourcePreloader = ResourcePreloader.getInstance();

// React hooks for resource preloading
export function useResourcePreloader() {
  const [stats, setStats] = React.useState(resourcePreloader.getPreloadStats());

  React.useEffect(() => {
    const updateStats = () => setStats(resourcePreloader.getPreloadStats());
    
    // Update stats periodically
    const interval = setInterval(updateStats, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    preloadComponent: (componentName: string) => 
      resourcePreloader.preloadComponentResources(componentName),
    preloadRoute: (route: string) => 
      resourcePreloader.preloadRouteResources(route),
    prefetchResource: (url: string, priority?: 'high' | 'low') => 
      resourcePreloader.prefetchResource(url, priority),
    observeElement: (element: HTMLElement, urls: string[]) => 
      resourcePreloader.observeElement(element, urls),
    stats
  };
}

// HOC for automatic component resource preloading
export function withResourcePreloading<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  const ComponentWithPreloading = React.forwardRef<any, P>((props, ref) => {
    React.useEffect(() => {
      resourcePreloader.preloadComponentResources(componentName);
    }, []);

    return <WrappedComponent {...props} ref={ref} />;
  });

  ComponentWithPreloading.displayName = `withResourcePreloading(${componentName})`;
  return ComponentWithPreloading;
}

// Preload directive for Next.js
export function preloadRouteResources(route: string) {
  resourcePreloader.preloadRouteResources(route);
}

// Critical resource preloader for app initialization
export function initializeCriticalResourcePreloading() {
  if (typeof window !== 'undefined') {
    resourcePreloader.preloadCriticalResources();
  }
}

// Cleanup function for app unmount
export function cleanupResourcePreloader() {
  resourcePreloader.cleanup();
}

// Smart preloading based on connection speed
export function adaptivePreloading() {
  if (!('connection' in navigator)) return;

  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType;

  // Adjust preloading strategy based on connection
  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      // Only preload critical resources
      logger.info('Slow connection detected, limiting preloading');
      break;
      
    case '3g':
      // Preload critical and important resources
      logger.info('3G connection detected, moderate preloading');
      break;
      
    case '4g':
    default:
      // Full preloading strategy
      logger.info('Fast connection detected, full preloading enabled');
      resourcePreloader.preloadCriticalResources();
      break;
  }
}

// Initialize adaptive preloading
if (typeof window !== 'undefined') {
  adaptivePreloading();
  
  // Re-evaluate on connection change
  if ('connection' in navigator) {
    (navigator as any).connection?.addEventListener('change', adaptivePreloading);
  }
}