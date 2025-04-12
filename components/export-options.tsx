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
import {
  getDailyPriceSummary,
  getMonthlyPriceSummary,
  getAllPrices,
} from '@/app/api/prices/route';

export default function ExportOptions() {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExportPdf = async (type: string) => {
    try {
      setIsExporting(type);

      let data;
      let title;
      let columns;

      if (type === 'daily') {
        data = await getDailyPriceSummary();
        if (!data || data.length === 0) {
          throw new Error('No daily data available for export');
        }
        title = 'สรุปราคาสินค้ารายวัน';
        interface Column {
          header: string;
          accessor: string;
          format?: (value: any) => string;
        }

        columns = [
          {
            header: 'วันที่',
            accessor: 'date',
            format: (value: any): string =>
              value ? format(new Date(value), 'PPP', { locale: th }) : 'N/A',
          },
          { header: 'จำนวนรายการ', accessor: 'count' },
          {
            header: 'ราคาเฉลี่ย (บาท)',
            accessor: 'averagePrice',
            format: (value: number): string =>
              typeof value === 'number' ? value.toFixed(2) : '0.00',
          },
          {
            header: 'ราคาต่ำสุด (บาท)',
            accessor: 'minPrice',
            format: (value: number): string =>
              typeof value === 'number' ? value.toFixed(2) : '0.00',
          },
          {
            header: 'ราคาสูงสุด (บาท)',
            accessor: 'maxPrice',
            format: (value: number): string =>
              typeof value === 'number' ? value.toFixed(2) : '0.00',
          },
        ] as Column[];
      } else if (type === 'monthly') {
        data = await getMonthlyPriceSummary();
        if (!data || data.length === 0) {
          throw new Error('No monthly data available for export');
        }
        title = 'สรุปราคาสินค้ารายเดือน';
        columns = [
          {
            header: 'เดือน',
            accessor: 'month',
            format: (value: any) =>
              value
                ? format(new Date(value), 'MMMM yyyy', { locale: th })
                : 'N/A',
          },
          { header: 'จำนวนรายการ', accessor: 'count' },
          {
            header: 'ราคาเฉลี่ย (บาท)',
            accessor: 'averagePrice',
            format: (value: any) =>
              typeof value === 'number' ? value.toFixed(2) : '0.00',
          },
          {
            header: 'ราคาต่ำสุด (บาท)',
            accessor: 'minPrice',
            format: (value: any) =>
              typeof value === 'number' ? value.toFixed(2) : '0.00',
          },
          {
            header: 'ราคาสูงสุด (บาท)',
            accessor: 'maxPrice',
            format: (value: any) =>
              typeof value === 'number' ? value.toFixed(2) : '0.00',
          },
        ];
      } else {
        data = await getAllPrices();
        if (!data || data.length === 0) {
          throw new Error('No data available for export');
        }
        title = 'รายการราคาสินค้าทั้งหมด';
        columns = [
          { header: 'ชื่อสินค้า', accessor: 'productName' },
          {
            header: 'ราคา (บาท)',
            accessor: 'price',
            format: (value: any) =>
              typeof value === 'number' ? value.toFixed(2) : '0.00',
          },
          { header: 'วันที่', accessor: 'date' },
        ];
      }

      await exportToPdf({ data, title, columns });
      toast.success('ส่งออกไฟล์ PDF สำเร็จ');
    } catch (error) {
      console.error(`Error exporting ${type} to PDF:`, error);
      toast.error('เกิดข้อผิดพลาดในการส่งออกไฟล์ PDF');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportSheets = async (type: string) => {
    try {
      setIsExporting(type + '-sheets');

      let data;
      let title;
      let sheetName;

      if (type === 'daily') {
        data = await getDailyPriceSummary();
        title = 'สรุปราคาสินค้ารายวัน';
        sheetName = 'DailySummary';
      } else if (type === 'monthly') {
        data = await getMonthlyPriceSummary();
        title = 'สรุปราคาสินค้ารายเดือน';
        sheetName = 'MonthlySummary';
      } else {
        data = await getAllPrices();
        title = 'รายการราคาสินค้าทั้งหมด';
        sheetName = 'AllPrices';
      }

      await exportToGoogleSheets({ data, title, sheetName });
      toast.success('ส่งออกไปยัง Google Sheets สำเร็จ');
    } catch (error) {
      console.error(`Error exporting ${type} to Google Sheets:`, error);
      toast.error('เกิดข้อผิดพลาดในการส่งออกไปยัง Google Sheets');
    } finally {
      setIsExporting(null);
    }
  };

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
