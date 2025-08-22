-- Database optimization for POS Retail Shop
-- Run these commands in your Supabase SQL editor

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Primary indexes for prices table
CREATE INDEX IF NOT EXISTS idx_prices_date_desc 
ON prices(date DESC);

CREATE INDEX IF NOT EXISTS idx_prices_product_name_gin 
ON prices USING gin(product_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_prices_price_btree 
ON prices(price);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_prices_date_product_composite 
ON prices(date DESC, product_name);

CREATE INDEX IF NOT EXISTS idx_prices_date_price_composite 
ON prices(date DESC, price);

-- Full-text search index for product names
CREATE INDEX IF NOT EXISTS idx_prices_product_name_fts 
ON prices USING gin(to_tsvector('english', product_name));

-- Partial indexes for recent data (better performance)
CREATE INDEX IF NOT EXISTS idx_prices_recent_month 
ON prices(date DESC, product_name) 
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_prices_recent_week 
ON prices(date DESC, price) 
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- ==========================================
-- CHECKLIST TABLE INDEXES
-- ==========================================

-- If checklist table exists
CREATE INDEX IF NOT EXISTS idx_checklist_date_desc 
ON checklist(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_status 
ON checklist(status);

-- ==========================================
-- PERFORMANCE SETTINGS
-- ==========================================

-- Enable pg_trgm extension for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable btree_gin for better composite indexes
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS for prices table
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Policy for read access (all users can read)
CREATE POLICY "Enable read access for all users" 
ON prices FOR SELECT 
USING (true);

-- Policy for insert (authenticated users only)
CREATE POLICY "Enable insert for authenticated users only" 
ON prices FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Policy for update (authenticated users only)
CREATE POLICY "Enable update for authenticated users only" 
ON prices FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Policy for delete (authenticated users only)
CREATE POLICY "Enable delete for authenticated users only" 
ON prices FOR DELETE 
USING (auth.role() = 'authenticated');

-- ==========================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ==========================================

-- Daily summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_price_summary AS
SELECT 
    date_trunc('day', date) as summary_date,
    COUNT(*) as total_items,
    AVG(price) as average_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    SUM(price) as total_value
FROM prices 
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY date_trunc('day', date)
ORDER BY summary_date DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_daily_summary_date 
ON daily_price_summary(summary_date DESC);

-- Monthly summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_price_summary AS
SELECT 
    date_trunc('month', date) as summary_month,
    COUNT(*) as total_items,
    AVG(price) as average_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    SUM(price) as total_value
FROM prices 
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY date_trunc('month', date)
ORDER BY summary_month DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_monthly_summary_month 
ON monthly_price_summary(summary_month DESC);

-- ==========================================
-- AUTOMATIC REFRESH FUNCTIONS
-- ==========================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_price_summaries()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_price_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_price_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic refresh (every hour)
SELECT cron.schedule('refresh-price-summaries', '0 * * * *', 'SELECT refresh_price_summaries();');

-- ==========================================
-- PERFORMANCE MONITORING
-- ==========================================

-- View to monitor slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100  -- queries taking more than 100ms
ORDER BY mean_time DESC;

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- ==========================================
-- MAINTENANCE PROCEDURES
-- ==========================================

-- Function for regular maintenance
CREATE OR REPLACE FUNCTION maintain_prices_table()
RETURNS void AS $$
BEGIN
    -- Update table statistics
    ANALYZE prices;
    
    -- Reindex if fragmentation is high
    REINDEX TABLE prices;
    
    -- Vacuum to reclaim space
    VACUUM ANALYZE prices;
    
    -- Log maintenance
    INSERT INTO maintenance_log (table_name, action, performed_at) 
    VALUES ('prices', 'maintenance', NOW());
END;
$$ LANGUAGE plpgsql;

-- Create maintenance log table
CREATE TABLE IF NOT EXISTS maintenance_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    performed_at TIMESTAMP DEFAULT NOW()
);

-- Schedule weekly maintenance
SELECT cron.schedule('weekly-maintenance', '0 2 * * 0', 'SELECT maintain_prices_table();');

-- ==========================================
-- CONNECTION POOLING RECOMMENDATIONS
-- ==========================================

-- These settings should be configured in Supabase dashboard:
-- 
-- Database Settings > Connection pooling:
-- - Pool Mode: Transaction
-- - Pool Size: 25 (adjust based on usage)
-- - Max Client Connections: 100
-- 
-- In your application, use these connection strings:
-- - Direct connection for real-time subscriptions
-- - Pooled connection for API routes and server actions

-- ==========================================
-- BACKUP AND ARCHIVAL
-- ==========================================

-- Archive old data to reduce table size
CREATE TABLE IF NOT EXISTS prices_archive (
    LIKE prices INCLUDING ALL
);

-- Function to archive old data (older than 2 years)
CREATE OR REPLACE FUNCTION archive_old_prices()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move old records to archive
    WITH moved_rows AS (
        DELETE FROM prices 
        WHERE date < CURRENT_DATE - INTERVAL '2 years'
        RETURNING *
    )
    INSERT INTO prices_archive 
    SELECT * FROM moved_rows;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Log archival
    INSERT INTO maintenance_log (table_name, action, performed_at) 
    VALUES ('prices', 'archived ' || archived_count || ' rows', NOW());
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly archival
SELECT cron.schedule('monthly-archive', '0 1 1 * *', 'SELECT archive_old_prices();');