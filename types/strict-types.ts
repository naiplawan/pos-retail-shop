// Strict type definitions for POS Retail Shop
// This file contains stricter type definitions to ensure type safety

// Branded types for better type safety
export type ProductId = string & { readonly __brand: 'ProductId' };
export type PriceAmount = number & { readonly __brand: 'PriceAmount' };
export type DateString = string & { readonly __brand: 'DateString' };
export type Barcode = string & { readonly __brand: 'Barcode' };
export type Currency = 'THB' | 'USD' | 'EUR';

// Type constructors for branded types
export const createProductId = (id: string): ProductId => id as ProductId;
export const createPriceAmount = (amount: number): PriceAmount => {
  if (amount < 0) throw new Error('Price cannot be negative');
  return amount as PriceAmount;
};
export const createDateString = (date: string): DateString => {
  if (!isValidDate(date)) throw new Error('Invalid date format');
  return date as DateString;
};
export const createBarcode = (barcode: string): Barcode => {
  if (!/^\d{8,13}$/.test(barcode)) throw new Error('Invalid barcode format');
  return barcode as Barcode;
};

// Utility type validators
const isValidDate = (date: string): boolean => {
  return !isNaN(Date.parse(date));
};

// Strict product interface
export interface StrictProduct {
  readonly id: ProductId;
  readonly name: string;
  readonly price: PriceAmount;
  readonly barcode?: Barcode;
  readonly category: ProductCategory;
  readonly currency: Currency;
  readonly createdAt: DateString;
  readonly updatedAt: DateString;
  readonly isActive: boolean;
}

// Product categories with strict typing
export const PRODUCT_CATEGORIES = [
  'food-beverage',
  'electronics',
  'clothing',
  'health-beauty',
  'home-garden',
  'sports-outdoors',
  'books-media',
  'other'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

// Form validation schemas as types
export interface ProductFormSchema {
  readonly name: string;
  readonly price: string; // String for form input, validated before conversion
  readonly category: ProductCategory;
  readonly barcode?: string;
  readonly description?: string;
}

// Validation result types
export type ValidationResult<T> = 
  | { readonly valid: true; readonly data: T; readonly errors?: never }
  | { readonly valid: false; readonly errors: ValidationErrors; readonly data?: never };

export type ValidationErrors = Readonly<Record<string, readonly string[]>>;

// Database operation types
export interface DatabaseOperation<T> {
  readonly type: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  readonly table: string;
  readonly data?: T;
  readonly id?: string;
  readonly timestamp: Date;
}

// Query result types with strict nullability
export type QueryResult<T> = 
  | { readonly success: true; readonly data: readonly T[]; readonly count: number }
  | { readonly success: false; readonly error: DatabaseError };

export interface DatabaseError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

// Configuration types
export interface AppConfig {
  readonly database: DatabaseConfig;
  readonly api: ApiConfig;
  readonly ui: UiConfig;
  readonly performance: PerformanceConfig;
}

export interface DatabaseConfig {
  readonly url: string;
  readonly key: string;
  readonly timeout: number;
  readonly retryAttempts: number;
}

export interface ApiConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly retries: number;
  readonly rateLimit: {
    readonly requests: number;
    readonly windowMs: number;
  };
}

export interface UiConfig {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly language: 'th' | 'en';
  readonly currency: Currency;
  readonly dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
}

export interface PerformanceConfig {
  readonly enableCaching: boolean;
  readonly cacheSize: number;
  readonly enableVirtualization: boolean;
  readonly enablePreloading: boolean;
  readonly enableServiceWorker: boolean;
}

// State management types
export interface AppState {
  readonly products: readonly StrictProduct[];
  readonly selectedProduct: StrictProduct | null;
  readonly filters: ProductFilters;
  readonly ui: UiState;
  readonly performance: PerformanceState;
}

export interface ProductFilters {
  readonly search: string;
  readonly category: ProductCategory | 'all';
  readonly dateRange: {
    readonly start: DateString | null;
    readonly end: DateString | null;
  };
  readonly priceRange: {
    readonly min: PriceAmount | null;
    readonly max: PriceAmount | null;
  };
}

export interface UiState {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly theme: UiConfig['theme'];
  readonly language: UiConfig['language'];
  readonly sidebarOpen: boolean;
  readonly modals: Readonly<Record<string, boolean>>;
}

export interface PerformanceState {
  readonly cacheHitRate: number;
  readonly averageResponseTime: number;
  readonly memoryUsage: number;
  readonly loadTime: number;
}

// Action types for state management
export type AppAction = 
  | { readonly type: 'SET_PRODUCTS'; readonly payload: readonly StrictProduct[] }
  | { readonly type: 'ADD_PRODUCT'; readonly payload: StrictProduct }
  | { readonly type: 'UPDATE_PRODUCT'; readonly payload: { readonly id: ProductId; readonly changes: Partial<StrictProduct> } }
  | { readonly type: 'DELETE_PRODUCT'; readonly payload: ProductId }
  | { readonly type: 'SET_SELECTED_PRODUCT'; readonly payload: StrictProduct | null }
  | { readonly type: 'SET_FILTERS'; readonly payload: Partial<ProductFilters> }
  | { readonly type: 'SET_UI_STATE'; readonly payload: Partial<UiState> }
  | { readonly type: 'SET_ERROR'; readonly payload: string | null }
  | { readonly type: 'SET_LOADING'; readonly payload: boolean };

// Event types
export interface AppEvent<T = unknown> {
  readonly type: string;
  readonly payload: T;
  readonly timestamp: Date;
  readonly source: 'user' | 'system' | 'api';
}

export type ProductEvent = 
  | AppEvent<{ readonly product: StrictProduct }> & { readonly type: 'PRODUCT_CREATED' }
  | AppEvent<{ readonly product: StrictProduct }> & { readonly type: 'PRODUCT_UPDATED' }
  | AppEvent<{ readonly id: ProductId }> & { readonly type: 'PRODUCT_DELETED' }
  | AppEvent<{ readonly id: ProductId }> & { readonly type: 'PRODUCT_VIEWED' };

// Cache types
export interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: Date;
  readonly ttl: number;
  readonly key: string;
}

export interface CacheConfig {
  readonly maxSize: number;
  readonly defaultTtl: number;
  readonly enableCompression: boolean;
  readonly enableEncryption: boolean;
}

// Performance monitoring types
export interface PerformanceMetric {
  readonly name: string;
  readonly value: number;
  readonly timestamp: Date;
  readonly tags: Readonly<Record<string, string>>;
}

export type MetricType = 
  | 'counter'
  | 'gauge' 
  | 'histogram'
  | 'timer';

export interface TimerMetric extends PerformanceMetric {
  readonly type: 'timer';
  readonly duration: number;
  readonly startTime: Date;
  readonly endTime: Date;
}

// Security types
export interface SecurityContext {
  readonly userId?: string;
  readonly sessionId: string;
  readonly permissions: readonly string[];
  readonly isAuthenticated: boolean;
  readonly tokenExpiry?: Date;
}

export interface AuditLog {
  readonly id: string;
  readonly action: string;
  readonly userId?: string;
  readonly resourceId?: string;
  readonly resourceType: string;
  readonly timestamp: Date;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

// Feature flag types
export interface FeatureFlags {
  readonly enableNewDashboard: boolean;
  readonly enableVirtualization: boolean;
  readonly enableOfflineMode: boolean;
  readonly enableAnalytics: boolean;
  readonly enablePushNotifications: boolean;
}

// Type utilities for strict checking
export type StrictKeys<T> = {
  readonly [K in keyof T]-?: T[K] extends undefined ? never : K;
}[keyof T];

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? readonly U[]
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

// Environment-specific types
export interface EnvironmentConfig {
  readonly NODE_ENV: 'development' | 'production' | 'test';
  readonly API_URL: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly ENABLE_ANALYTICS: boolean;
  readonly ENABLE_SERVICE_WORKER: boolean;
  readonly LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

// Type assertion helpers
export const assertIsString = (value: unknown): asserts value is string => {
  if (typeof value !== 'string') {
    throw new Error(`Expected string, got ${typeof value}`);
  }
};

export const assertIsNumber = (value: unknown): asserts value is number => {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`Expected number, got ${typeof value}`);
  }
};

export const assertIsValidProduct = (value: unknown): asserts value is StrictProduct => {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected product object');
  }
  
  const product = value as Record<string, unknown>;
  
  if (typeof product.id !== 'string') {
    throw new Error('Product id must be a string');
  }
  
  if (typeof product.name !== 'string') {
    throw new Error('Product name must be a string');
  }
  
  if (typeof product.price !== 'number' || product.price < 0) {
    throw new Error('Product price must be a non-negative number');
  }
  
  if (!PRODUCT_CATEGORIES.includes(product.category as ProductCategory)) {
    throw new Error('Product category must be valid');
  }
};

// Export type-only imports for better tree shaking
export type {
  StrictProduct as Product,
  ProductCategory as Category,
  ProductFilters as Filters,
  AppState as State,
  AppAction as Action,
  AppEvent as Event
};