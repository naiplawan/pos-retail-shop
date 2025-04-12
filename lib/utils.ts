import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types for price data
export interface PriceData {
  id: string | number;
  product_name: string;
  price: number;
  date: string;
}

// Interface for daily summary
export interface DailySummary {
  date: string;
  total: number;
  count: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
}

// Interface for monthly summary
export interface MonthlySummary {
  month: string;
  total: number;
  count: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
}

/**
 * Calculate daily summaries from price data
 * @param pricesData Array of price data
 * @returns Array of daily summaries sorted by date (newest first)
 */
export function calculateDailySummary(pricesData: PriceData[]): DailySummary[] {
  // Group prices by date and calculate daily totals, min and max prices
  const dailySummary = pricesData.reduce((acc: Record<string, {
    date: string;
    total: number;
    count: number;
    minPrice: number;
    maxPrice: number;
  }>, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = {
        date,
        total: 0,
        count: 0,
        minPrice: Number.MAX_SAFE_INTEGER,
        maxPrice: Number.MIN_SAFE_INTEGER
      };
    }
    acc[date].total += item.price;
    acc[date].count += 1;
    // Update min and max prices
    acc[date].minPrice = Math.min(acc[date].minPrice, item.price);
    acc[date].maxPrice = Math.max(acc[date].maxPrice, item.price);
    return acc;
  }, {});

  // Convert to array and sort by date (newest first)
  return Object.values(dailySummary)
    .map(item => ({
      date: item.date,
      total: item.total,
      count: item.count,
      // Calculate average price as total price divided by total number of products
      averagePrice: item.count > 0 ? item.total / item.count : 0,
      minPrice: item.minPrice === Number.MAX_SAFE_INTEGER ? 0 : item.minPrice,
      maxPrice: item.maxPrice === Number.MIN_SAFE_INTEGER ? 0 : item.maxPrice
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Calculate monthly summaries from price data
 * @param pricesData Array of price data
 * @returns Array of monthly summaries sorted by month (newest first)
 */
export function calculateMonthlySummary(pricesData: PriceData[]): MonthlySummary[] {
  // Group prices by month and calculate monthly totals, min and max prices
  const monthlySummary = pricesData.reduce((acc: Record<string, {
    month: string;
    total: number;
    count: number;
    minPrice: number;
    maxPrice: number;
  }>, item) => {
    const month = item.date.slice(0, 7); // Extract YYYY-MM
    if (!acc[month]) {
      acc[month] = {
        month,
        total: 0,
        count: 0,
        minPrice: Number.MAX_SAFE_INTEGER,
        maxPrice: Number.MIN_SAFE_INTEGER
      };
    }
    acc[month].total += item.price;
    acc[month].count += 1;
    // Update min and max prices
    acc[month].minPrice = Math.min(acc[month].minPrice, item.price);
    acc[month].maxPrice = Math.max(acc[month].maxPrice, item.price);
    return acc;
  }, {});

  // Convert to array and sort by month (newest first)
  return Object.values(monthlySummary)
    .map(item => ({
      month: item.month,
      total: item.total,
      count: item.count,
      averagePrice: item.count > 0 ? item.total / item.count : 0,
      minPrice: item.minPrice === Number.MAX_SAFE_INTEGER ? 0 : item.minPrice,
      maxPrice: item.maxPrice === Number.MIN_SAFE_INTEGER ? 0 : item.maxPrice
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Format prices for display
 * @param pricesData Array of price data
 * @param limit Number of items to return
 * @returns Formatted price data
 */
export function formatPriceData(pricesData: PriceData[], limit: number) {
  return pricesData
    .slice(0, limit)
    .map(item => ({
      id: item.id,
      productName: item.product_name,
      price: item.price,
      date: item.date,
    }));
}
