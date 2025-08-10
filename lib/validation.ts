import { z } from "zod"

// Price validation schema
export const priceSchema = z.object({
  productName: z
    .string()
    .min(1, "Product name is required")
    .max(100, "Product name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_.(),]+$/, "Product name contains invalid characters"),
  price: z
    .number()
    .positive("Price must be positive")
    .max(999999.99, "Price is too large")
    .refine((val) => Number(val.toFixed(2)) === val, "Price can have at most 2 decimal places"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((val) => {
      const date = new Date(val)
      const now = new Date()
      return date <= now && date >= new Date('2000-01-01')
    }, "Date must be between 2000-01-01 and today")
})

// Barcode validation schema
export const barcodeSchema = z.object({
  barcode: z
    .string()
    .min(1, "Barcode is required")
    .max(50, "Barcode must be less than 50 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Barcode can only contain letters and numbers")
})

// ID validation schema (for database operations)
export const idSchema = z.object({
  id: z
    .union([z.string(), z.number()])
    .refine((val) => {
      if (typeof val === 'string') {
        return /^\d+$/.test(val) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
      }
      return Number.isInteger(val) && val > 0
    }, "Invalid ID format")
})

// Date range validation schema
export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate)
  }
  return true
}, "Start date must be before or equal to end date")

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(10)
})

// Search validation schema
export const searchSchema = z.object({
  query: z
    .string()
    .max(100, "Search query must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_.(),]*$/, "Search query contains invalid characters")
    .optional()
})

// Error types for better error handling
export class ValidationError extends Error {
  constructor(message: string, public errors: z.ZodError) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Helper function to validate and throw formatted errors
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error
    )
  }
  
  return result.data
}

// Helper function for API route validation
export function createApiValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    const result = schema.safeParse(data)
    
    if (!result.success) {
      return {
        success: false as const,
        error: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }
    }
    
    return {
      success: true as const,
      data: result.data
    }
  }
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['";]/g, '') // Remove SQL injection characters
}

export function sanitizeNumber(input: unknown): number | null {
  const num = Number(input)
  return Number.isFinite(num) ? num : null
}