export type PriceData = {
  id: string
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

export type ExportColumn = {
  header: string
  accessor: string
  format?: (value: any) => string | number
}

export type ExportOptions = {
  data: any[]
  title: string
  columns: ExportColumn[]
}

export type SheetsExportOptions = {
  data: any[]
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
