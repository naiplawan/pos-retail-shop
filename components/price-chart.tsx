'use client';

import { format, parse } from 'date-fns';
import { th } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import type { AllSummaryData } from '@/types';
import {
  Chart,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartTooltipItem,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from '@/components/ui/chart';

type PriceChartProps = {
  data: AllSummaryData[] | any[];
};

export default function PriceChart({ data }: PriceChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const safeData = Array.isArray(data) ? data : [];
  console.log('Raw Chart Data:', safeData);

  const processedData = safeData.map((item) => ({
    date: item?.date || '',
    month: item?.month || (item?.date ? item.date.substring(0, 7) : ''),
    averagePrice: Number(item?.averagePrice || 0),
    count: Number(item?.count || 0),
    totalSales:
      Number(item?.totalSales || item?.total || 0) ||
      Number(item?.averagePrice || 0) * Number(item?.count || 0),
  }));

  const filteredData = processedData
    .filter((item) => item.date || item.month)
    .sort((a, b) => {
      const keyA = a.date || a.month;
      const keyB = b.date || b.month;
      return keyA.localeCompare(keyB);
    });

  if (filteredData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center border rounded-md p-4">
        <p className="text-muted-foreground">ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="flex h-[400px] items-center justify-center border rounded-md">
        <div className="text-muted-foreground">กำลังโหลดกราฟ...</div>
      </div>
    );
  }

  const xAxisKey = filteredData[0].date ? 'date' : 'month';

  const formatDate = (value: string) => {
    if (!value) return 'ไม่ระบุ';
    try {
      if (value.length === 10) {
        return format(new Date(value), 'd MMM', { locale: th });
      } else if (value.length === 7) {
        const date = parse(value, 'yyyy-MM', new Date());
        return format(date, 'MMM yyyy', { locale: th });
      }
      return value;
    } catch (e) {
      console.error('Date formatting error:', e, 'Value:', value);
      return value;
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString();

  return (
    <div className="w-full h-[400px] border rounded-md p-2">
      <ChartContainer>
        <Chart>
          <LineChart data={filteredData}>
            <XAxis dataKey={xAxisKey} tickFormatter={formatDate} />
            <YAxis tickFormatter={formatCurrency} />
            <Line
              dataKey="totalSales"
              stroke="#2563eb"
              strokeWidth={2}
              name="ยอดขายรวม"
            />
            <Line
              dataKey="averagePrice"
              stroke="#10b981"
              strokeWidth={2}
              name="ราคาเฉลี่ย"
            />
            <ChartTooltip>
              {({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;

                  let formattedDate = 'ไม่ระบุ';
                  try {
                    if (data.date) {
                      formattedDate = format(
                        new Date(data.date),
                        'd MMMM yyyy',
                        { locale: th }
                      );
                    } else if (data.month) {
                      const date = parse(data.month, 'yyyy-MM', new Date());
                      formattedDate = format(date, 'MMMM yyyy', { locale: th });
                    }
                  } catch (e) {
                    console.error('Date formatting error:', e);
                  }

                  return (
                    <ChartTooltipContent>
                      <div className="font-medium">{formattedDate}</div>
                      <ChartTooltipItem
                        name="ยอดขายรวม"
                        value={`${(data.totalSales || 0).toLocaleString()} บาท`}
                        color="#2563eb"
                      />
                      <ChartTooltipItem
                        name="จำนวนรายการ"
                        value={(data.count || 0).toLocaleString()}
                      />
                      <ChartTooltipItem
                        name="ราคาเฉลี่ย"
                        value={`${(
                          data.averagePrice || 0
                        ).toLocaleString()} บาท`}
                        color="#10b981"
                      />
                    </ChartTooltipContent>
                  );
                }
                return null;
              }}
            </ChartTooltip>
          </LineChart>
        </Chart>
      </ChartContainer>
    </div>
  );
}
