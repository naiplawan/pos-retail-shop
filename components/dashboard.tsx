'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getDailyPriceSummary,
  getMonthlyPriceSummary,
  getRecentPrices,
} from '@/app/api/prices/route';
import { getallSummaryData } from '@/app/api/summary/all/route';
import type {
  PriceData,
  DailySummaryData,
  MonthlySummaryData,
  AllSummaryData,
} from '@/types';
import PriceChart from '@/components/price-chart';
import RecentPricesTable from '@/components/recent-prices-table';
import { toast } from 'sonner';

export default function Dashboard() {
  const [recentPrices, setRecentPrices] = useState<PriceData[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummaryData[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryData[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<AllSummaryData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [recentData, dailyData, monthlyData, summaryData] =
          await Promise.all([
            getRecentPrices(),
            getDailyPriceSummary(),
            getMonthlyPriceSummary(),
            getallSummaryData(null, null),
          ]);

        // Ensure recentData is an array
        const normalizedRecentData = Array.isArray(recentData)
          ? recentData
          : recentData &&
            typeof recentData === 'object' &&
            'data' in (recentData as { data?: unknown }) &&
            Array.isArray((recentData as { data?: unknown }).data)
          ? (recentData as { data: PriceData[] }).data
          : [];

        // Ensure dailyData is an array
        const normalizedDailyData = Array.isArray(dailyData)
          ? dailyData
          : dailyData &&
            typeof dailyData === 'object' &&
            'data' in (dailyData as { data?: unknown }) &&
            Array.isArray((dailyData as { data?: unknown }).data)
          ? (dailyData as { data: DailySummaryData[] }).data
          : [];

        // Ensure monthlyData is an array
        const normalizedMonthlyData = Array.isArray(monthlyData)
          ? monthlyData
          : monthlyData &&
            typeof monthlyData === 'object' &&
            'data' in (monthlyData as { data?: unknown }) &&
            Array.isArray((monthlyData as { data?: unknown }).data)
          ? (monthlyData as { data: MonthlySummaryData[] }).data
          : [];

        const normalizedSummaryData = Array.isArray(summaryData)
          ? summaryData
          : summaryData &&
            typeof summaryData === 'object' &&
            'data' in (summaryData as { data?: unknown }) &&
            Array.isArray((summaryData as { data?: unknown }).data)
          ? (summaryData as { data: AllSummaryData[] }).data
          : [];

        setRecentPrices(normalizedRecentData);
        setDailySummary(normalizedDailyData);
        setMonthlySummary(normalizedMonthlyData);
        setSummaryData(normalizedSummaryData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="grid gap-4 sm:gap-6 px-2 sm:px-0 pb-16 md:pb-0">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Total items card */}
        <Card className="group">
          <CardHeader className="pb-3 px-5">
            <CardTitle className="text-base sm:text-lg">
              จำนวนรายการทั้งหมด
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              จำนวนรายการราคาที่บันทึกไว้
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
              {recentPrices.length}
            </div>
          </CardContent>
        </Card>

        {/* Daily average card */}
        <Card className="group">
          <CardHeader className="pb-3 px-5">
            <CardTitle className="text-base sm:text-lg">
              ราคาเฉลี่ยวันนี้
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              ราคาเฉลี่ยของสินค้าทั้งหมดวันนี้
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
              {dailySummary.length > 0
                ? `${dailySummary[0].averagePrice.toFixed(2)}`
                : 'ไม่มีข้อมูล'}
              <span className="text-base text-muted-foreground ml-1">บาท</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly average card */}
        <Card className="group sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3 px-5">
            <CardTitle className="text-base sm:text-lg">
              ราคาเฉลี่ยเดือนนี้
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              ราคาเฉลี่ยของสินค้าทั้งหมดเดือนนี้
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
              {monthlySummary.length > 0
                ? `${monthlySummary[0].averagePrice.toFixed(2)}`
                : 'ไม่มีข้อมูล'}
              <span className="text-base text-muted-foreground ml-1">บาท</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent items table */}
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base sm:text-lg">รายการล่าสุด</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            รายการราคาสินค้าที่บันทึกล่าสุด
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-2 overflow-auto">
          <div className="min-w-full">
            <RecentPricesTable data={recentPrices} isLoading={isLoading} />
          </div>
        </CardContent>
      </Card>

      {/* Price chart */}
      <Card>
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base sm:text-lg">กราฟราคา</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            กราฟแสดงราคาสินค้าตลอดระยะเวลาที่บันทึก
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[400px] md:h-[500px] lg:h-[600px] p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">
                กำลังโหลดข้อมูล...
              </p>
            </div>
          ) : (
            <PriceChart data={summaryData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
