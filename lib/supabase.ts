import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Client-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Mock data for demo purposes
const mockPricesData = [
  { id: 1, productName: 'โค้ก 325ml', price: 15.00, category: 'เครื่องดื่ม', date: new Date().toISOString() },
  { id: 2, productName: 'มาม่า รสหมูสับ', price: 8.50, category: 'อาหารแห้ง', date: new Date().toISOString() },
  { id: 3, productName: 'น้ำดื่ม 600ml', price: 5.00, category: 'เครื่องดื่ม', date: new Date().toISOString() },
];

// Create a mock/demo client if environment variables are missing
let supabase: any;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn('Missing Supabase environment variables, using mock client for demo');
  
  // Mock client for development/demo purposes with sample data
  supabase = {
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
      signInWithPassword: () => ({ data: { user: null }, error: null }),
      signOut: () => ({ error: null }),
    },
    realtime: {
      channel: () => ({
        on: () => ({ subscribe: () => {} }),
        unsubscribe: () => {},
      }),
    },
  };
} else {
  // Create real Supabase client
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export { supabase };
export default supabase;