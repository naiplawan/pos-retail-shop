// Core data types with strict typing
export interface PriceData {
  readonly id: string | number;
  productName: string;
  price: number;
  date: string;
  quantity?: number;
  category?: string;
  barcode?: string;
  supplier?: string;
  cost?: number;
  profit?: number;
  notes?: string;
}

export interface DailySummaryData {
  readonly date: string;
  count: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  totalItems: number;
  totalRevenue?: number;
  topProduct?: string;
}

export interface MonthlySummaryData {
  readonly month: string;
  count: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  totalRevenue: number;
  totalItems: number;
  growthRate?: number;
  previousMonth?: number;
}

export interface AllSummaryData {
  readonly month: string;
  productName: string;
  price: number;
  date: string;
  count: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  totalSales: number;
  category?: string;
  trend?: 'up' | 'down' | 'stable';
}

export type ExportColumn<T = Record<string, unknown>> = {
  header: string
  accessor: keyof T
  format?: (value: T[keyof T]) => string | number
}

export type ExportOptions<T = Record<string, unknown>> = {
  data: T[]
  title: string
  columns: ExportColumn<T>[]
}

export type SheetsExportOptions<T = Record<string, unknown>> = {
  data: T[]
  title: string
  sheetName: string
}

export interface ChecklistItem {
  id: number;
  product_name: string;
  price: number;
  date: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistSheet {
  id: number;
  checklist_sheet_no: string;
  created_at: string;
  updated_at: string;
}

// API Response types with discriminated unions
export type ApiResponse<T> = 
  | {
      readonly success: true;
      data: T;
      message?: string;
      error?: never;
    }
  | {
      readonly success: false;
      error: string;
      code?: string;
      data?: never;
      message?: never;
    };

export interface ApiError {
  readonly message: string;
  readonly code?: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly timestamp?: string;
  readonly path?: string;
}

// Enhanced error handling types
export interface AppError extends Error {
  readonly code?: string;
  readonly statusCode?: number;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly timestamp?: Date;
  readonly context?: string;
  readonly recoverable?: boolean;
}

// Type guards for API responses
export const isApiSuccess = <T>(response: ApiResponse<T>): response is Extract<ApiResponse<T>, { success: true }> => {
  return response.success === true;
};

export const isApiError = <T>(response: ApiResponse<T>): response is Extract<ApiResponse<T>, { success: false }> => {
  return response.success === false;
};

// Form data types
export interface PriceFormData {
  productName: string;
  price: string | number;
  date: string;
}

export interface BarcodeData {
  barcode: string;
  productName?: string;
}

// Database query types
export interface DatabaseQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PriceQueryFilters extends DatabaseQueryOptions {
  productName?: string;
  startDate?: string;
  endDate?: string;
}

// Chart data types
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

// Component prop types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
