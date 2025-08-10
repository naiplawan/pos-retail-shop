export type PriceData = {
  id: string | number
  productName: string
  price: number
  date: string
}

export type DailySummaryData = {
  date: string
  count: number
  averagePrice: number
  minPrice: number
  maxPrice: number
}

export type MonthlySummaryData = {
  month: string
  count: number
  averagePrice: number
  minPrice: number
  maxPrice: number
}

export type AllSummaryData = {
  month: string
  productName: string
  price: number
  date: string
  count: number
  averagePrice: number
  minPrice: number
  maxPrice: number
  totalSales: number
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

// API Response types
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  data?: never;
}

export type ApiError = {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Error handling types
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

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
