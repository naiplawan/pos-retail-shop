'use client';

import { useState, useEffect } from 'react';
import type { AllSummaryData } from '@/types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type PriceChartProps = {
  data: AllSummaryData[] | null | undefined;
};

export default function PriceChart({ data }: PriceChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const safeData = Array.isArray(data) ? data : [];
  // Remove console.log for production

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

  const chartData = {
    labels: filteredData.map((item) => item.date || item.month),
    datasets: [
      {
        label: 'ยอดขายรวม',
        data: filteredData.map((item) => item.totalSales),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        borderWidth: 2,
      },
      {
        label: 'ราคาเฉลี่ย',
        data: filteredData.map((item) => item.averagePrice),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: { raw: number }) => {
            const value = context.raw;
            return `${value.toLocaleString()} บาท`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'วันที่',
        },
      },
      y: {
        title: {
          display: true,
          text: 'มูลค่า (บาท)',
        },
      },
    },
  };

  return (
    <div className="w-full h-full border rounded-md p-2">
      <Line data={chartData} options={options} />
    </div>
  );
}
