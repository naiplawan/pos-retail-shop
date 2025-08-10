'use client';

import { useMemo, memo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {
  PriceData,
  DailySummaryData,
  MonthlySummaryData,
  AllSummaryData,
} from '@/types';
import PriceChart from '@/components/price-chart';
import RecentPricesTable from '@/components/recent-prices-table';
import { toast } from 'sonner';
import { Package, TrendingUp, Calendar, Receipt } from 'lucide-react';
import { useCachedApiData } from '@/hooks/use-api-data';
import { DashboardErrorBoundary } from '@/components/error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickActions, QuickStats } from '@/components/quick-actions';
import { AdvancedSearch } from '@/components/advanced-search';
import { EnhancedCharts } from '@/components/enhanced-charts';
import { InventoryManager } from '@/components/inventory-manager';
import { PrintSystem } from '@/components/print-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

// Helper function to safely extract data
function normalizeApiResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray((response as { data: T[] }).data)
  ) {
    return (response as { data: T[] }).data;
  }

  return [];
}

// Memoized stat card component
const StatCard = memo(function StatCard({
  title,
  description,
  value,
  isLoading,
  icon,
  color = 'blue',
}: {
  title: string;
  description: string;
  value: string;
  isLoading: boolean;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  
  return (
    <Card className="bg-white border-2 hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3 px-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-gray-800">{title}</CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              {description}
            </CardDescription>
          </div>
          <div className={cn('p-3 rounded-xl', colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="text-3xl sm:text-4xl font-bold text-gray-900">
          {isLoading ? (
            <Skeleton className="h-10 w-32 rounded-lg" />
          ) : (
            value
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSearch, setShowSearch] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  // Use custom hooks for data fetching with caching
  const { data: recentPricesResponse, isLoading: recentLoading, error: recentError } = useCachedApiData(
    'recent-prices',
    async () => {
      const response = await fetch('/api/prices?limit=10');
      if (!response.ok) throw new Error('Failed to fetch recent prices');
      return response.json();
    }
  );

  const { data: dailySummaryResponse, isLoading: dailyLoading } = useCachedApiData(
    'daily-summary',
    async () => {
      const response = await fetch('/api/prices?type=daily');
      if (!response.ok) throw new Error('Failed to fetch daily summary');
      return response.json();
    }
  );

  const { data: monthlySummaryResponse, isLoading: monthlyLoading } = useCachedApiData(
    'monthly-summary',
    async () => {
      const response = await fetch('/api/prices?type=monthly');
      if (!response.ok) throw new Error('Failed to fetch monthly summary');
      return response.json();
    }
  );

  const { data: allSummaryResponse, isLoading: summaryLoading } = useCachedApiData(
    'all-summary',
    async () => {
      const response = await fetch('/api/summary/all');
      if (!response.ok) throw new Error('Failed to fetch summary data');
      return response.json();
    }
  );

  // Memoized data normalization
  const recentPrices = useMemo(() => 
    normalizeApiResponse<PriceData>(recentPricesResponse), 
    [recentPricesResponse]
  );

  const dailySummary = useMemo(() => 
    normalizeApiResponse<DailySummaryData>(dailySummaryResponse), 
    [dailySummaryResponse]
  );

  const monthlySummary = useMemo(() => 
    normalizeApiResponse<MonthlySummaryData>(monthlySummaryResponse), 
    [monthlySummaryResponse]
  );

  const summaryData = useMemo(() => 
    normalizeApiResponse<AllSummaryData>(allSummaryResponse), 
    [allSummaryResponse]
  );

  // Memoized computed values
  const stats = useMemo(() => ({
    totalItems: recentPrices.length.toString(),
    dailyAverage: dailySummary.length > 0 
      ? `${dailySummary[0].averagePrice.toFixed(2)} บาท` 
      : 'ไม่มีข้อมูล',
    monthlyAverage: monthlySummary.length > 0 
      ? `${monthlySummary[0].averagePrice.toFixed(2)} บาท` 
      : 'ไม่มีข้อมูล'
  }), [recentPrices.length, dailySummary, monthlySummary]);

  const isLoading = recentLoading || dailyLoading || monthlyLoading || summaryLoading;

  // Handle errors
  if (recentError) {
    toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด');
  }

  // Quick action handlers
  const handleAddProduct = () => {
    setActiveTab('add-product');
  };

  const handleSearch = () => {
    setShowSearch(true);
  };

  const handlePrintReport = () => {
    setShowPrint(true);
  };

  const handleViewSales = () => {
    setActiveTab('analytics');
  };

  const handleSearchResults = (filters: any) => {
    // Mock search implementation
    const mockResults = [
      { id: '1', productName: 'โค้ก 325ml', price: 15, date: '2024-01-15', category: 'เครื่องดื่ม' },
      { id: '2', productName: 'มาม่า รสหมูสับ', price: 8, date: '2024-01-14', category: 'อาหารแห้ง' }
    ].filter(item => !filters.query || item.productName.toLowerCase().includes(filters.query.toLowerCase()));
    
    setSearchResults(mockResults as any);
  };

  return (
    <DashboardErrorBoundary>
      <div className="space-y-6">
        {/* Quick Stats */}
        <QuickStats />
        
        {/* Quick Actions */}
        <QuickActions 
          onAddProduct={handleAddProduct}
          onSearch={handleSearch}
          onViewSales={handleViewSales}
          onPrintReport={handlePrintReport}
        />
        
        {/* Advanced Search Modal */}
        {showSearch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-4xl">
              <AdvancedSearch
                onSearch={handleSearchResults}
                onClear={() => setSearchResults([])}
                results={searchResults}
              />
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowSearch(false)}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Print System Modal */}
        {showPrint && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="w-full max-w-6xl my-8">
              <PrintSystem onClose={() => setShowPrint(false)} />
            </div>
          </div>
        )}
        
        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="text-sm">สรุปภาพรวม</TabsTrigger>
            <TabsTrigger value="analytics" className="text-sm">การวิเคราะห์</TabsTrigger>
            <TabsTrigger value="inventory" className="text-sm">คลังสินค้า</TabsTrigger>
            <TabsTrigger value="add-product" className="text-sm">เพิ่มสินค้า</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Traditional Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="สินค้าทั้งหมด"
                description="จำนวนรายการที่บันทึก"
                value={stats.totalItems}
                isLoading={recentLoading}
                icon={<Package className="h-6 w-6" />}
                color="blue"
              />
              
              <StatCard
                title="ราคาวันนี้"
                description="ราคาเฉลี่ยของวันนี้"
                value={stats.dailyAverage}
                isLoading={dailyLoading}
                icon={<TrendingUp className="h-6 w-6" />}
                color="green"
              />
              
              <StatCard
                title="ราคาเดือนนี้"
                description="ราคาเฉลี่ยเดือนนี้"
                value={stats.monthlyAverage}
                isLoading={monthlyLoading}
                icon={<Calendar className="h-6 w-6" />}
                color="purple"
              />
            </div>

            {/* Recent items table */}
            <Card className="bg-white border-2 overflow-hidden">
              <CardHeader className="px-6 py-5 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-800">รายการล่าสุด</CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      สินค้าที่บันทึกล่าสุด 10 รายการ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-2 overflow-auto">
                <div className="min-w-full">
                  <RecentPricesTable data={recentPrices} isLoading={recentLoading} />
                </div>
              </CardContent>
            </Card>

            {/* Price chart */}
            <Card className="bg-white border-2 overflow-hidden">
              <CardHeader className="px-6 py-5 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-800">กราฟราคาสินค้า</CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      แสดงแนวโน้มราคาตามช่วงเวลา
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[400px] md:h-[500px] lg:h-[600px] p-0 sm:p-2">
                {summaryLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                  <PriceChart data={summaryData} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics">
            <EnhancedCharts 
              salesData={[]}
              productData={[]}
              profitData={[]}
            />
          </TabsContent>
          
          <TabsContent value="inventory">
            <InventoryManager />
          </TabsContent>
          
          <TabsContent value="add-product">
            <Card className="bg-white border-2">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800">เพิ่มสินค้าใหม่</CardTitle>
                <CardDescription>บันทึกข้อมูลสินค้าใหม่เข้าระบบ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>ฟอร์มเพิ่มสินค้าจะถูกเพิ่มในอนาคต</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardErrorBoundary>
  );
}
