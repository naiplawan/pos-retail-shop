'use client';

import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import type { PriceData } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type RecentPricesTableProps = {
  data: PriceData[] | PriceData | null | undefined;
  isLoading: boolean;
};

export default function RecentPricesTable({
  data,
  isLoading,
}: RecentPricesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4" role="status" aria-label="กำลังโหลดข้อมูลราคาสินค้า">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <span className="sr-only">กำลังโหลดตารางราคาสินค้า</span>
      </div>
    );
  }

  // Remove console.log for production

  // Ensure data is an array
  const priceData = Array.isArray(data)
    ? data
    : data &&
      typeof data === 'object' &&
      ('id' in data ||
        'product_name' in data ||
        'price' in data ||
        'date' in data)
    ? [data] // Wrap single object in an array
    : [];

  if (priceData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4" role="status">
        <div className="text-muted-foreground/20 mb-4">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-muted-foreground text-sm" aria-live="polite">ไม่มีข้อมูลราคาสินค้า</p>
      </div>
    );
  }

  const isValidPriceItem = (item: unknown): item is PriceData => {
    return (
      item &&
      typeof item === 'object' &&
      'id' in item &&
      ('product_name' in item || 'productName' in item) &&
      'price' in item &&
      'date' in item
    );
  };

  return (
    <Table role="table" aria-label="ตารางราคาสินค้าล่าสุด">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">ชื่อสินค้า</TableHead>
          <TableHead scope="col">ราคา (บาท)</TableHead>
          <TableHead scope="col">วันที่</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {priceData.filter(isValidPriceItem).map((item) => {
          // Handle different property name conventions (productName vs product_name)
          const productName = item.productName || '';
          // Make sure price is a number
          const price =
            typeof item.price === 'number'
              ? item.price
              : parseFloat(String(item.price)) || 0;
          const date = item.date;

          return (
            <TableRow 
              key={item.id || `${productName}-${date}-${price}`}
              className="hover:bg-muted/50 transition-colors"
            >
              <TableCell className="font-medium">{productName}</TableCell>
              <TableCell className="tabular-nums">
                <span className="text-primary font-semibold">
                  {price.toFixed(2)}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(date), 'PPP', { locale: th })}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
