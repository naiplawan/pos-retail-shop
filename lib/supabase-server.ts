import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Server-side Supabase client for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Mock data for demo purposes
const mockPricesData = [
  { id: 1, product_name: 'โค้ก 325ml', price: 15.00, category: 'เครื่องดื่ม', date: new Date().toISOString() },
  { id: 2, product_name: 'มาม่า รสหมูสับ', price: 8.50, category: 'อาหารแห้ง', date: new Date().toISOString() },
  { id: 3, product_name: 'น้ำดื่ม 600ml', price: 5.00, category: 'เครื่องดื่ม', date: new Date().toISOString() },
];

// Create a mock/demo client if environment variables are missing
let supabaseServer: any;

if (!supabaseUrl || !supabaseServiceRoleKey || supabaseServiceRoleKey === 'dummy_service_role_key') {
  logger.warn('Missing or invalid Supabase environment variables, using mock client for demo');
  
  // Mock client for development/demo purposes with sample data
  supabaseServer = {
    from: (table: string) => ({
      select: (fields?: string) => ({ 
        data: table === 'prices' ? mockPricesData : [], 
        error: null 
      }),
      insert: (data: any) => ({ 
        data: { id: Date.now(), ...data }, 
        error: null 
      }),
      update: (data: any) => ({ 
        data: { ...data }, 
        error: null 
      }),
      delete: () => ({ 
        data: null, 
        error: null 
      }),
      upsert: (data: any) => ({ 
        data: { id: Date.now(), ...data }, 
        error: null 
      }),
      eq: (column: string, value: any) => ({
        select: () => ({ data: mockPricesData.filter(item => (item as any)[column] === value), error: null }),
        update: (data: any) => ({ data: { ...data }, error: null }),
        delete: () => ({ data: null, error: null }),
      }),
      order: (column: string, options?: any) => ({
        data: [...mockPricesData].sort((a, b) => {
          const aVal = (a as any)[column];
          const bVal = (b as any)[column];
          return options?.ascending ? aVal - bVal : bVal - aVal;
        }), 
        error: null
      }),
    }),
    auth: {
      getUser: () => ({ data: { user: null }, error: null }),
    },
  };
} else {
  // Create real Supabase client
  supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export { supabaseServer };

// Helper function for error handling
export async function handleSupabaseError<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  errorMessage: string
): Promise<T> {
  try {
    const { data, error } = await operation();
    
    if (error) {
      logger.error(`${errorMessage}:`, error);
      throw new Error(error.message || errorMessage);
    }
    
    if (!data) {
      throw new Error(`No data returned: ${errorMessage}`);
    }
    
    return data;
  } catch (error) {
    logger.error(`Supabase operation failed: ${errorMessage}`, error);
    throw error;
  }
}