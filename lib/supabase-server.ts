import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Server-side Supabase client for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  logger.error('Missing Supabase environment variables');
  throw new Error('Missing required Supabase environment variables');
}

// Create a single instance to be reused
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

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