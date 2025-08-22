// Global type definitions for POS Retail Shop

// Extend the global Window interface
declare global {
  interface Window {
    // PWA installation prompt
    deferredPrompt?: any;
    
    // Performance monitoring
    performance: Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    // Service Worker
    workbox?: any;
    
    // Analytics
    gtag?: (
      command: 'config' | 'event' | 'exception' | 'page_view' | 'timing_complete',
      targetId: string,
      config?: any
    ) => void;

    // App Badge API
    navigator: Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
      connection?: {
        effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
        downlink: number;
        rtt: number;
        saveData: boolean;
        addEventListener: (type: string, listener: () => void) => void;
      };
      share?: (data: ShareData) => Promise<void>;
      standalone?: boolean;
    };

    // Database APIs
    indexedDB: IDBFactory;
    
    // Payment Request API (for future POS features)
    PaymentRequest?: {
      new (
        methodData: PaymentMethodData[],
        details: PaymentDetailsInit,
        options?: PaymentOptions
      ): PaymentRequest;
    };

    // Web Locks API
    navigator: Navigator & {
      locks?: {
        request: (
          name: string,
          callback: () => Promise<any>
        ) => Promise<any>;
      };
    };
  }

  // Environment variables
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
      NEXT_PUBLIC_APP_NAME?: string;
      NEXT_PUBLIC_APP_VERSION?: string;
    }
  }

  // Custom events
  interface WindowEventMap {
    'app-update-available': CustomEvent;
    'app-offline': CustomEvent;
    'app-online': CustomEvent;
    'pwa-install-prompt': CustomEvent<{
      prompt: any;
    }>;
    'performance-warning': CustomEvent<{
      metric: string;
      value: number;
      threshold: number;
    }>;
  }
}

// React global types
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Custom attributes for our app
    'data-testid'?: string;
    'data-preload'?: string;
    'data-priority'?: 'high' | 'low' | 'auto';
    'data-component'?: string;
  }
}

// Module augmentation for libraries
declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    // Add custom methods if needed
  }
}

declare module 'next/image' {
  interface ImageProps {
    // Add custom props if needed
    onLoadComplete?: () => void;
  }
}

// Utility types for the POS system
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type NonEmptyArray<T> = [T, ...T[]];

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Database types
export interface DatabaseTimestamps {
  created_at: string;
  updated_at: string;
}

export interface DatabaseRecord extends DatabaseTimestamps {
  id: string;
}

// Error types
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T = unknown> {
  data: T;
  error?: AppError;
  status: 'success' | 'error';
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Form types
export type FormState<T> = {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isValid: boolean;
};

// Component prop helpers
export type ComponentPropsWithRef<T extends React.ElementType> = 
  React.ComponentPropsWithRef<T> & {
    as?: T;
  };

export type PolymorphicProps<T extends React.ElementType, P = {}> = 
  P & Omit<React.ComponentPropsWithoutRef<T>, keyof P> & {
    as?: T;
  };

// Theme types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  destructive: string;
  warning: string;
  success: string;
}

// Performance types
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url?: string;
}

export interface CoreWebVitals {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

// Offline storage types
export interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  expiry?: number;
  version?: string;
}

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

// Ensure this file is treated as a module
export {};