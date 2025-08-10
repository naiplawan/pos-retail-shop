'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { exportToGoogleSheets, exportToPdf } from '@/lib/export';
// Remove direct server function imports - use API calls instead

// Update the `getExportData` function to handle empty data gracefully
const getExportData = async (type: string) => {
  let data;
  let title;
  let columns;

  if (type === 'daily') {
    const response = await fetch('/api/prices?type=daily');
    if (!response.ok) {
      throw new Error('Failed to fetch daily summary');
    }
    const result = await response.json();
    data = result.data || [];
    title = 'สรุปราคาสินค้ารายวัน';
    columns = [
      {
        header: 'วันที่',
        accessor: 'date',
        format: (value: unknown): string => {
          if (value && (typeof value === 'string' || typeof value === 'number' || value instanceof Date)) {
            return format(new Date(value), 'PPP', { locale: th });
          }
          return 'N/A';
        },
      },
      { header: 'จำนวนรายการ', accessor: 'count' },
      {
        header: 'ราคาเฉลี่ย (บาท)',
        accessor: 'averagePrice',
        format: (value: unknown): string =>
          typeof value === 'number' ? value.toFixed(2) : '0.00',
      },
      {
        header: 'ราคาต่ำสุด (บาท)',
        accessor: 'minPrice',
        format: (value: unknown): string =>
          typeof value === 'number' ? value.toFixed(2) : '0.00',
      },
      {
        header: 'ราคาสูงสุด (บาท)',
        accessor: 'maxPrice',
        format: (value: unknown): string =>
          typeof value === 'number' ? value.toFixed(2) : '0.00',
      },
    ];
  } else if (type === 'monthly') {
    const response = await fetch('/api/prices?type=monthly');
    if (!response.ok) {
      throw new Error('Failed to fetch monthly summary');
    }
    const result = await response.json();
    data = result.data || [];
    title = 'สรุปราคาสินค้ารายเดือน';
    columns = [
      {
        header: 'เดือน',
        accessor: 'month',
        format: (value: unknown): string => {
          if (value && (typeof value === 'string' || typeof value === 'number' || value instanceof Date)) {
            return format(new Date(value), 'MMMM yyyy', { locale: th });
          }
          return 'N/A';
        },
      },
      { header: 'จำนวนรายการ', accessor: 'count' },
      {
        header: 'ราคาเฉลี่ย (บาท)',
        accessor: 'averagePrice',
        format: (value: unknown): string =>
          typeof value === 'number' ? value.toFixed(2) : '0.00',
      },
      {
        header: 'ราคาต่ำสุด (บาท)',
        accessor: 'minPrice',
        format: (value: unknown): string =>
          typeof value === 'number' ? value.toFixed(2) : '0.00',
      },
      {
        header: 'ราคาสูงสุด (บาท)',
        accessor: 'maxPrice',
        format: (value: unknown): string =>
          typeof value === 'number' ? value.toFixed(2) : '0.00',
      },
    ];
  } else {
    const response = await fetch('/api/prices');
    if (!response.ok) {
      throw new Error('Failed to fetch all prices');
    }
    const result = await response.json();
    data = result.data || [];
    title = 'รายการราคาสินค้าทั้งหมด';
    columns = [
      { header: 'ชื่อสินค้า', accessor: 'productName' },
      {
        header: 'ราคา (บาท)',
        accessor: 'price',
        format: (value: unknown): string =>
          typeof value === 'number' ? value.toFixed(2) : '0.00',
      },
      { header: 'วันที่', accessor: 'date' },
    ];
  }

  // Ensure data is always an array, even if empty
  data = Array.isArray(data) ? data : [];

  return { data, title, columns };
};

// Add debugging logs to trace the issue
const handleExportPdf = async (type: string) => {
  try {
    console.log('Setting isExporting to:', type);
    const { data, title, columns } = await getExportData(type);
    await exportToPdf({ data, title, columns });
    toast.success('ส่งออกไฟล์ PDF สำเร็จ');
  } catch (error) {
    console.error(`Error exporting ${type} to PDF:`, error);
    toast.error('เกิดข้อผิดพลาดในการส่งออกไฟล์ PDF');
  } finally {
    console.log('Resetting isExporting to null');
  }
};

const handleExportSheets = async (type: string) => {
  try {
    console.log('Setting isExporting to:', type + '-sheets');
    const { data, title } = await getExportData(type);
    const sheetName =
      type === 'daily'
        ? 'DailySummary'
        : type === 'monthly'
        ? 'MonthlySummary'
        : 'AllPrices';
    await exportToGoogleSheets({ data, title, sheetName });
    toast.success('ส่งออกไปยัง Google Sheets สำเร็จ');
  } catch (error) {
    console.error(`Error exporting ${type} to Google Sheets:`, error);
    toast.error('เกิดข้อผิดพลาดในการส่งออกไปยัง Google Sheets');
  } finally {
    console.log('Resetting isExporting to null');
  }
};

export default function ExportOptions() {
  const [isExporting] = useState<string | null>(null);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>สรุปรายวัน</CardTitle>
          <CardDescription>ส่งออกข้อมูลสรุปราคาสินค้ารายวัน</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <FileText className="h-16 w-16 text-muted-foreground" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => handleExportPdf('daily')}
            disabled={isExporting !== null}
          >
            <FileText className="mr-2 h-4 w-4" />
            {isExporting === 'daily' ? 'กำลังส่งออก...' : 'ส่งออก PDF'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleExportSheets('daily')}
            disabled={isExporting !== null}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExporting === 'daily-sheets'
              ? 'กำลังส่งออก...'
              : 'ส่งออก Google Sheets'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>สรุปรายเดือน</CardTitle>
          <CardDescription>ส่งออกข้อมูลสรุปราคาสินค้ารายเดือน</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <FileText className="h-16 w-16 text-muted-foreground" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => handleExportPdf('monthly')}
            disabled={isExporting !== null}
          >
            <FileText className="mr-2 h-4 w-4" />
            {isExporting === 'monthly' ? 'กำลังส่งออก...' : 'ส่งออก PDF'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleExportSheets('monthly')}
            disabled={isExporting !== null}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExporting === 'monthly-sheets'
              ? 'กำลังส่งออก...'
              : 'ส่งออก Google Sheets'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลทั้งหมด</CardTitle>
          <CardDescription>ส่งออกข้อมูลราคาสินค้าทั้งหมด</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Download className="h-16 w-16 text-muted-foreground" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => handleExportPdf('all')}
            disabled={isExporting !== null}
          >
            <FileText className="mr-2 h-4 w-4" />
            {isExporting === 'all' ? 'กำลังส่งออก...' : 'ส่งออก PDF'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleExportSheets('all')}
            disabled={isExporting !== null}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExporting === 'all-sheets'
              ? 'กำลังส่งออก...'
              : 'ส่งออก Google Sheets'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
