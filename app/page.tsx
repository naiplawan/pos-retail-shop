'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import Dashboard from '@/components/dashboard';
import DailySummary from '@/components/daily-summary';
import MonthlySummary from '@/components/monthly-summary';
import ExportOptions from '@/components/export-options';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PriceForm from '@/components/price-form';
import { useMediaQuery } from '@/hooks/use-mobile';

export default function Home() {
  const [refreshData, setRefreshData] = useState(0);
  const [formData, setFormData] = useState({
    productName: '',
    price: '',
    date: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleConfirm = () => {
    toast.success('บันทึกข้อมูลสำเร็จ!');
    setFormData({ productName: '', price: '', date: '' });
    setIsModalOpen(false);
  };

  return (
    <>
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6 text-center tracking-tight">
          แดชบอร์ด
        </h1>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList
            className={`flex flex-wrap mb-6 sm:mb-8 ${
              isMobile ? 'overflow-x-auto' : ''
            }`}
          >
            <TabsTrigger
              className="text-xs sm:text-sm py-2 flex-1"
              value="dashboard"
            >
              แดชบอร์ด
            </TabsTrigger>
            <TabsTrigger
              className="text-xs sm:text-sm py-2 flex-1"
              value="add-price"
            >
              เพิ่มสินค้า
            </TabsTrigger>
            <TabsTrigger
              className="text-xs sm:text-sm py-2 flex-1"
              value="daily"
            >
              รายวัน
            </TabsTrigger>
            <TabsTrigger
              className="text-xs sm:text-sm py-2 flex-1"
              value="monthly"
            >
              รายเดือน
            </TabsTrigger>
            <TabsTrigger
              className="text-xs sm:text-sm py-2 flex-1"
              value="export"
            >
              ส่งออก
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard key={refreshData} />
          </TabsContent>

          <TabsContent value="add-price">
            <PriceForm
              onDataChange={() => setRefreshData((prev) => prev + 1)}
            />
          </TabsContent>

          <TabsContent value="daily">
            <DailySummary key={refreshData} />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlySummary key={refreshData} />
          </TabsContent>

          <TabsContent value="export">
            <ExportOptions />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">ยืนยันข้อมูล</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-sm text-muted-foreground">ชื่อสินค้า</span>
              <span className="text-sm font-medium">{formData.productName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-sm text-muted-foreground">ราคา</span>
              <span className="text-sm font-medium">{formData.price}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-sm text-muted-foreground">วันที่</span>
              <span className="text-sm font-medium">{formData.date}</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirm}
            >
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />
    </>
  );
}
