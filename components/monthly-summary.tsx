'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';
// Remove direct import of server-side function
import type { MonthlySummaryData } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToPdf } from '@/lib/export';

export default function MonthlySummary() {
  const [data, setData] = useState<MonthlySummaryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/prices?type=monthly');
        if (!response.ok) {
          throw new Error('Failed to fetch monthly summary');
        }
        const result = await response.json();
        if (!result.data || !Array.isArray(result.data)) {
          throw new Error('Invalid data format received from API');
        }
        setData(result.data);
      } catch (error) {
        console.error('Error fetching monthly summary:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลสรุปรายเดือน');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleExportPdf = async () => {
    try {
      await exportToPdf({
        data,
        title: 'สรุปราคาสินค้ารายเดือน',
        columns: [
          {
            header: 'เดือน',
            accessor: 'month',
            format: (value: { split: (arg0: string) => [any, any] }) => {
              const [year, month] = value.split('-');
              return format(
                new Date(Number.parseInt(year), Number.parseInt(month) - 1),
                'MMMM yyyy',
                { locale: th }
              );
            },
          },
          { header: 'จำนวนรายการ', accessor: 'count' },
          {
            header: 'ราคาเฉลี่ย (บาท)',
            accessor: 'averagePrice',
            format: (value: number) =>
              typeof value === 'number' ? value.toFixed(2) : '0.00',
          },
          {
            header: 'ราคาต่ำสุด (บาท)',
            accessor: 'minPrice',
            format: (value: number) =>
              typeof value === 'number' ? value.toFixed(2) : '0.00',
          },
          {
            header: 'ราคาสูงสุด (บาท)',
            accessor: 'maxPrice',
            format: (value: number) =>
              typeof value === 'number' ? value.toFixed(2) : '0.00',
          },
        ],
      });
      toast.success('ส่งออกไฟล์ PDF สำเร็จ');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งออกไฟล์ PDF');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>สรุปราคาสินค้ารายเดือน</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={isLoading || data.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          ส่งออก PDF
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">ไม่มีข้อมูลสรุปรายเดือน</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เดือน</TableHead>
                <TableHead>จำนวนรายการ</TableHead>
                <TableHead>ราคาเฉลี่ย (บาท)</TableHead>
                <TableHead>ราคาต่ำสุด (บาท)</TableHead>
                <TableHead>ราคาสูงสุด (บาท)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.month}>
                  <TableCell>
                    {(() => {
                      const [year, month] = item.month.split('-');
                      return format(
                        new Date(
                          Number.parseInt(year),
                          Number.parseInt(month) - 1
                        ),
                        'MMMM yyyy',
                        {
                          locale: th,
                        }
                      );
                    })()}
                  </TableCell>
                  <TableCell>{item.count}</TableCell>
                  <TableCell>
                    {typeof item.averagePrice === 'number'
                      ? item.averagePrice.toFixed(2)
                      : '0.00'}
                  </TableCell>
                  <TableCell>
                    {typeof item.minPrice === 'number'
                      ? item.minPrice.toFixed(2)
                      : '0.00'}
                  </TableCell>
                  <TableCell>
                    {typeof item.maxPrice === 'number'
                      ? item.maxPrice.toFixed(2)
                      : '0.00'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
