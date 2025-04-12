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
import { getallSummaryData } from '@/app/api/summary/all/routes';
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

        setRecentPrices(normalizedRecentData);
        setDailySummary(normalizedDailyData);
        setMonthlySummary(normalizedMonthlyData);
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
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>จำนวนรายการทั้งหมด</CardTitle>
            <CardDescription>จำนวนรายการราคาที่บันทึกไว้</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentPrices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>ราคาเฉลี่ยวันนี้</CardTitle>
            <CardDescription>ราคาเฉลี่ยของสินค้าทั้งหมดวันนี้</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dailySummary.length > 0
                ? `${dailySummary[0].averagePrice.toFixed(2)} บาท`
                : 'ไม่มีข้อมูล'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>ราคาเฉลี่ยเดือนนี้</CardTitle>
            <CardDescription>
              ราคาเฉลี่ยของสินค้าทั้งหมดเดือนนี้
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {monthlySummary.length > 0
                ? `${monthlySummary[0].averagePrice.toFixed(2)} บาท`
                : 'ไม่มีข้อมูล'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการล่าสุด</CardTitle>
          <CardDescription>รายการราคาสินค้าที่บันทึกล่าสุด</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentPricesTable data={recentPrices} isLoading={isLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>กราฟราคา</CardTitle>
          <CardDescription>
            กราฟแสดงราคาสินค้าตลอดระยะเวลาที่บันทึก
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <PriceChart data={summaryData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
