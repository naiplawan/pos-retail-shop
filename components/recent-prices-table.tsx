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
  data: PriceData[] | any;
  isLoading: boolean;
};

export default function F({
  data,
  isLoading,
}: RecentPricesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  console.log('Raw Price Data:', data);

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
      <div className="text-center py-6">
        <p className="text-muted-foreground">ไม่มีข้อมูลราคาสินค้า</p>
      </div>
    );
  }

  const isValidPriceItem = (item: any): boolean => {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ชื่อสินค้า</TableHead>
          <TableHead>ราคา (บาท)</TableHead>
          <TableHead>วันที่</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {priceData.filter(isValidPriceItem).map((item: any) => {
          // Handle different property name conventions (productName vs product_name)
          const productName = item.productName || item.product_name || '';
          // Make sure price is a number
          const price =
            typeof item.price === 'number'
              ? item.price
              : parseFloat(String(item.price)) || 0;
          const date = item.date;

          return (
            <TableRow key={item.id || `${productName}-${date}-${price}`}>
              <TableCell>{productName}</TableCell>
              <TableCell>{price.toFixed(2)}</TableCell>
              <TableCell>
                {format(new Date(date), 'PPP', { locale: th })}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
