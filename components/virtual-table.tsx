'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Download, Filter, Sort } from 'lucide-react';
import { logger } from '@/lib/logger';

interface VirtualTableColumn<T> {
  key: keyof T;
  title: string;
  width?: number;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
}

interface VirtualTableProps<T> {
  data: T[];
  columns: VirtualTableColumn<T>[];
  height?: number;
  itemHeight?: number;
  loading?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  onRowClick?: (record: T, index: number) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  onExport?: () => void;
  className?: string;
  overscan?: number;
  estimatedItemSize?: number;
  variableHeight?: boolean;
  getItemHeight?: (index: number, data: T[]) => number;
  searchKeys?: (keyof T)[];
  placeholder?: string;
  emptyMessage?: string;
}

interface SortState {
  key: string | null;
  direction: 'asc' | 'desc';
}

interface FilterState {
  [key: string]: any;
}

// Virtual table row component
const TableRow = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    columns: VirtualTableColumn<any>[];
    onRowClick?: (record: any, index: number) => void;
  };
}>(({ index, style, data }) => {
  const { items, columns, onRowClick } = data;
  const item = items[index];

  if (!item) {
    return (
      <div style={style} className="flex border-b">
        {columns.map((_, colIndex) => (
          <div key={colIndex} className="flex-1 p-2">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`
        flex border-b hover:bg-gray-50 cursor-pointer transition-colors
        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
      `}
      onClick={() => onRowClick?.(item, index)}
    >
      {columns.map((column, colIndex) => {
        const value = item[column.key];
        const content = column.render ? column.render(value, item, index) : value;
        
        return (
          <div
            key={String(column.key)}
            className={`
              flex-shrink-0 p-3 border-r text-sm
              ${column.align === 'center' ? 'text-center' : ''}
              ${column.align === 'right' ? 'text-right' : ''}
            `}
            style={{ 
              width: column.width || 150,
              minWidth: column.width || 150,
            }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
});

TableRow.displayName = 'TableRow';

// Variable height row component
const VariableTableRow = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    columns: VirtualTableColumn<any>[];
    onRowClick?: (record: any, index: number) => void;
    getItemHeight?: (index: number, data: any[]) => number;
  };
}>(({ index, style, data }) => {
  const { items, columns, onRowClick } = data;
  const item = items[index];

  if (!item) {
    return (
      <div style={style} className="flex border-b">
        {columns.map((_, colIndex) => (
          <div key={colIndex} className="flex-1 p-2">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`
        flex border-b hover:bg-gray-50 cursor-pointer transition-colors
        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
      `}
      onClick={() => onRowClick?.(item, index)}
    >
      {columns.map((column) => {
        const value = item[column.key];
        const content = column.render ? column.render(value, item, index) : value;
        
        return (
          <div
            key={String(column.key)}
            className={`
              flex-shrink-0 p-3 border-r text-sm
              ${column.align === 'center' ? 'text-center' : ''}
              ${column.align === 'right' ? 'text-right' : ''}
            `}
            style={{ 
              width: column.width || 150,
              minWidth: column.width || 150,
            }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
});

VariableTableRow.displayName = 'VariableTableRow';

export default function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  height = 600,
  itemHeight = 50,
  loading = false,
  searchable = true,
  sortable = true,
  filterable = false,
  exportable = false,
  onRowClick,
  onSort,
  onFilter,
  onExport,
  className = '',
  overscan = 5,
  estimatedItemSize = 50,
  variableHeight = false,
  getItemHeight,
  searchKeys,
  placeholder = 'ค้นหา...',
  emptyMessage = 'ไม่มีข้อมูล',
}: VirtualTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortState, setSortState] = useState<SortState>({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);
  
  const listRef = useRef<any>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Calculate total width for horizontal scrolling
  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (col.width || 150), 0);
  }, [columns]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm && searchable) {
      const searchKeys_ = searchKeys || Object.keys(data[0] || {}) as (keyof T)[];
      result = result.filter(item =>
        searchKeys_.some(key =>
          String(item[key]).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        result = result.filter(item =>
          String(item[key as keyof T]).toLowerCase().includes(String(value).toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortState.key && sortable) {
      result.sort((a, b) => {
        const aVal = a[sortState.key as keyof T];
        const bVal = b[sortState.key as keyof T];
        
        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;
        
        return sortState.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, searchTerm, sortState, filters, searchKeys, searchable, sortable]);

  // Handle sorting
  const handleSort = useCallback((key: keyof T) => {
    const newDirection = 
      sortState.key === key && sortState.direction === 'asc' ? 'desc' : 'asc';
    
    const newSortState = { key: String(key), direction: newDirection };
    setSortState(newSortState);
    onSort?.(key, newDirection);
  }, [sortState, onSort]);

  // Handle filtering
  const handleFilter = useCallback((key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);
  }, [filters, onFilter]);

  // Handle export
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport();
    } else {
      // Default CSV export
      const csvContent = [
        // Header
        columns.map(col => col.title).join(','),
        // Data rows
        ...processedData.map(row =>
          columns.map(col => {
            const value = row[col.key];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'table-data.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }, [columns, processedData, onExport]);

  // Sync header scroll with list scroll
  const handleScroll = useCallback(({ scrollLeft }: { scrollLeft: number }) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  // Variable height calculation
  const getVariableItemHeight = useCallback((index: number) => {
    if (getItemHeight) {
      return getItemHeight(index, processedData);
    }
    return estimatedItemSize;
  }, [getItemHeight, processedData, estimatedItemSize]);

  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      if (endTime - startTime > 100) {
        logger.warn(`VirtualTable render took ${(endTime - startTime).toFixed(2)}ms`);
      }
    };
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Header Controls */}
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            ข้อมูลทั้งหมด ({processedData.length} รายการ)
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {filterable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                ตัวกรอง
              </Button>
            )}
            
            {exportable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-1" />
                ส่งออก
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Filters */}
        {filterable && showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            {columns
              .filter(col => col.filterable)
              .map(column => (
                <div key={String(column.key)}>
                  <label className="block text-sm font-medium mb-1">
                    {column.title}
                  </label>
                  <Input
                    placeholder={`กรอง ${column.title}`}
                    value={filters[String(column.key)] || ''}
                    onChange={(e) => handleFilter(String(column.key), e.target.value)}
                  />
                </div>
              ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {processedData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            {/* Table Header */}
            <div
              ref={headerRef}
              className="flex border-b bg-gray-50 overflow-hidden"
              style={{ width: totalWidth }}
            >
              {columns.map((column) => (
                <div
                  key={String(column.key)}
                  className={`
                    flex-shrink-0 p-3 border-r font-medium text-sm text-gray-700
                    ${sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''}
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.align === 'right' ? 'text-right' : ''}
                  `}
                  style={{ 
                    width: column.width || 150,
                    minWidth: column.width || 150,
                  }}
                  onClick={() => {
                    if (sortable && column.sortable !== false) {
                      handleSort(column.key);
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    {column.title}
                    {sortable && column.sortable !== false && (
                      <Sort 
                        className={`h-3 w-3 ${
                          sortState.key === String(column.key) 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Virtual List */}
            {variableHeight ? (
              <VariableSizeList
                ref={listRef}
                height={height}
                itemCount={processedData.length}
                itemSize={getVariableItemHeight}
                itemData={{
                  items: processedData,
                  columns,
                  onRowClick,
                  getItemHeight,
                }}
                overscanCount={overscan}
                onScroll={handleScroll}
                width={totalWidth}
              >
                {VariableTableRow}
              </VariableSizeList>
            ) : (
              <List
                ref={listRef}
                height={height}
                itemCount={processedData.length}
                itemSize={itemHeight}
                itemData={{
                  items: processedData,
                  columns,
                  onRowClick,
                }}
                overscanCount={overscan}
                onScroll={handleScroll}
                width={totalWidth}
              >
                {TableRow}
              </List>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for virtual table performance optimization
export function useVirtualTableOptimization<T>(data: T[]) {
  const [optimizedData, setOptimizedData] = useState<T[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (data.length > 1000) {
      setIsProcessing(true);
      
      // Use requestIdleCallback for non-blocking processing
      const processData = () => {
        const chunkSize = 100;
        let index = 0;
        const result: T[] = [];

        const processChunk = () => {
          const endIndex = Math.min(index + chunkSize, data.length);
          
          for (let i = index; i < endIndex; i++) {
            result.push(data[i]);
          }
          
          index = endIndex;

          if (index < data.length) {
            requestIdleCallback(processChunk);
          } else {
            setOptimizedData(result);
            setIsProcessing(false);
          }
        };

        requestIdleCallback(processChunk);
      };

      processData();
    } else {
      setOptimizedData(data);
      setIsProcessing(false);
    }
  }, [data]);

  return { data: optimizedData, isProcessing };
}

// Memoized virtual table for better performance
export const MemoizedVirtualTable = React.memo(VirtualTable) as typeof VirtualTable;