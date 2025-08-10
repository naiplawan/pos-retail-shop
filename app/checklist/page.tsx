'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChecklistDetail from './checklist-detail';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChecklistItem, ChecklistSheet } from '@/types';

function ChecklistContent() {
  const searchParams = useSearchParams();
  const [sheetsData, setSheetsData] = useState<ChecklistSheet[]>([]);
  const [itemData, setItemData] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sheets data
        const sheetsResponse = await fetch('/api/checklist/sheets');
        const sheets = await sheetsResponse.json();
        setSheetsData(sheets?.data || []);

        // Get items for selected sheet if sheetId is provided
        const sheetId = searchParams.get('sheetId');
        if (sheetId) {
          const sheetIdNum = parseInt(sheetId, 10);
          if (!isNaN(sheetIdNum)) {
            const itemsResponse = await fetch(`/api/checklist/items?sheetId=${sheetIdNum}`);
            const items = await itemsResponse.json();
            setItemData(items?.data || []);
          }
        }
      } catch (error) {
        console.error('Error fetching checklist data:', error);
        setSheetsData([]);
        setItemData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return <ChecklistDetail initialItems={itemData} initialSheets={sheetsData} />;
}

export default function Checklist() {
  return (
    <main className="container mx-auto p-4 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent animate-slideInUp">
          รายการคำสั่งซื้อ
        </h1>
        <p className="text-center text-muted-foreground text-sm sm:text-base mt-2">จัดการรายการคำสั่งซื้อและติดตามสินค้า</p>
      </div>
      <Suspense fallback={
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      }>
        <ChecklistContent />
      </Suspense>
    </main>
  );
}
