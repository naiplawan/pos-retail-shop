import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PriceData, DailySummaryData, MonthlySummaryData } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate daily summaries from price data - Optimized O(n) version
 * @param pricesData Array of price data
 * @returns Array of daily summaries sorted by date (newest first)
 */
export function calculateDailySummary(pricesData: PriceData[]): DailySummary[] {
  if (!pricesData.length) return [];

  // Use Map for better performance with string keys
  const summaryMap = new Map<string, {
    date: string;
    total: number;
    count: number;
    minPrice: number;
    maxPrice: number;
  }>();

  // Single pass through data
  for (const item of pricesData) {
    const date = item.date;
    const price = Number(item.price); // Ensure numeric
    
    if (isNaN(price)) continue; // Skip invalid prices
    
    const existing = summaryMap.get(date);
    
    if (existing) {
      existing.total += price;
      existing.count += 1;
      existing.minPrice = Math.min(existing.minPrice, price);
      existing.maxPrice = Math.max(existing.maxPrice, price);
    } else {
      summaryMap.set(date, {
        date,
        total: price,
        count: 1,
        minPrice: price,
        maxPrice: price
      });
    }
  }

  // Convert to array and calculate averages in one pass
  const results: DailySummary[] = [];
  
  for (const summary of summaryMap.values()) {
    results.push({
      date: summary.date,
      total: summary.total,
      count: summary.count,
      averagePrice: summary.total / summary.count,
      minPrice: summary.minPrice,
      maxPrice: summary.maxPrice
    });
  }

  // Sort by date (newest first) - more efficient string comparison
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Calculate monthly summaries from price data - Optimized O(n) version
 * @param pricesData Array of price data
 * @returns Array of monthly summaries sorted by month (newest first)
 */
export function calculateMonthlySummary(pricesData: PriceData[]): MonthlySummary[] {
  if (!pricesData.length) return [];

  // Use Map for better performance
  const summaryMap = new Map<string, {
    month: string;
    total: number;
    count: number;
    minPrice: number;
    maxPrice: number;
  }>();

  // Single pass through data
  for (const item of pricesData) {
    const month = item.date.slice(0, 7); // Extract YYYY-MM
    const price = Number(item.price); // Ensure numeric
    
    if (isNaN(price)) continue; // Skip invalid prices
    
    const existing = summaryMap.get(month);
    
    if (existing) {
      existing.total += price;
      existing.count += 1;
      existing.minPrice = Math.min(existing.minPrice, price);
      existing.maxPrice = Math.max(existing.maxPrice, price);
    } else {
      summaryMap.set(month, {
        month,
        total: price,
        count: 1,
        minPrice: price,
        maxPrice: price
      });
    }
  }

  // Convert to array and calculate averages in one pass
  const results: MonthlySummary[] = [];
  
  for (const summary of summaryMap.values()) {
    results.push({
      month: summary.month,
      total: summary.total,
      count: summary.count,
      averagePrice: summary.total / summary.count,
      minPrice: summary.minPrice,
      maxPrice: summary.maxPrice
    });
  }

  // Sort by month (newest first)
  return results.sort((a, b) => b.month.localeCompare(a.month));
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
      productName: item.productName,
      price: item.price,
      date: item.date,
    }));
}

/**
 * Format price for display with Thai Baht currency
 * @param price Price number
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
  return typeof price === 'number' && !isNaN(price) 
    ? `${price.toFixed(2)} บาท` 
    : '0.00 บาท';
}

/**
 * Format date for display in Thai format
 * @param dateString Date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Debounce function for search inputs
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance-sensitive operations
 * @param func Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T, 
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Safe JSON parse with fallback
 * @param jsonString JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

/**
 * Create a cache with TTL (Time To Live)
 * @param ttl Time to live in milliseconds
 * @returns Cache object with get, set, and clear methods
 */
export function createTTLCache<T>(ttl: number = 5 * 60 * 1000) {
  const cache = new Map<string, { value: T; expires: number }>();

  return {
    get(key: string): T | null {
      const item = cache.get(key);
      if (!item) return null;
      
      if (Date.now() > item.expires) {
        cache.delete(key);
        return null;
      }
      
      return item.value;
    },
    
    set(key: string, value: T): void {
      cache.set(key, {
        value,
        expires: Date.now() + ttl
      });
    },
    
    clear(): void {
      cache.clear();
    },
    
    size(): number {
      return cache.size;
    }
  };
}
