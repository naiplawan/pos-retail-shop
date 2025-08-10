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
import PriceForm from '@/components/price-form';
import { useMediaQuery } from '@/hooks/use-mobile';
import { 
  Home, 
  Plus, 
  Calendar, 
  CalendarDays, 
  Download,
  Store,
  Package,
  TrendingUp,
  Receipt 
} from 'lucide-react';

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
      <main className="container mx-auto p-4 max-w-6xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Store className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            ร้านค้าของคุณ
          </h1>
          <p className="text-gray-600 text-lg mt-2">ระบบจัดการร้านค้าแบบง่าย ๆ</p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full space-y-6">
          <TabsList
            className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 h-auto p-2 bg-gray-100 rounded-xl"
          >
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:shadow-soft py-4 px-4 rounded-lg transition-all flex flex-col sm:flex-row items-center gap-2 hover:bg-white/50 text-gray-700 data-[state=active]:text-primary"
              value="dashboard"
            >
              <Home className="h-5 w-5" />
              <span className="text-sm sm:text-base font-medium">หน้าหลัก</span>
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:shadow-soft py-4 px-4 rounded-lg transition-all flex flex-col sm:flex-row items-center gap-2 hover:bg-white/50 text-gray-700 data-[state=active]:text-primary"
              value="add-price"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm sm:text-base font-medium">เพิ่มสินค้า</span>
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:shadow-soft py-4 px-4 rounded-lg transition-all flex flex-col sm:flex-row items-center gap-2 hover:bg-white/50 text-gray-700 data-[state=active]:text-primary"
              value="daily"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-sm sm:text-base font-medium">รายวัน</span>
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:shadow-soft py-4 px-4 rounded-lg transition-all flex flex-col sm:flex-row items-center gap-2 hover:bg-white/50 text-gray-700 data-[state=active]:text-primary"
              value="monthly"
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-sm sm:text-base font-medium">รายเดือน</span>
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:shadow-soft py-4 px-4 rounded-lg transition-all flex flex-col sm:flex-row items-center gap-2 hover:bg-white/50 text-gray-700 data-[state=active]:text-primary col-span-2 sm:col-span-1"
              value="export"
            >
              <Download className="h-5 w-5" />
              <span className="text-sm sm:text-base font-medium">พิมพ์/ส่งออก</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="animate-fadeIn space-y-6">
            <Dashboard key={refreshData} />
          </TabsContent>

          <TabsContent value="add-price" className="animate-fadeIn">
            <PriceForm
              onDataChange={() => setRefreshData((prev) => prev + 1)}
            />
          </TabsContent>

          <TabsContent value="daily" className="animate-fadeIn">
            <DailySummary key={refreshData} />
          </TabsContent>

          <TabsContent value="monthly" className="animate-fadeIn">
            <MonthlySummary key={refreshData} />
          </TabsContent>

          <TabsContent value="export" className="animate-fadeIn">
            <ExportOptions />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันข้อมูล</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <p>
              <strong>ชื่อสินค้า:</strong> {formData.productName}
            </p>
            <p>
              <strong>ราคา:</strong> {formData.price}
            </p>
            <p>
              <strong>วันที่:</strong> {formData.date}
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setIsModalOpen(false)}
              className="bg-gray-500 text-white text-xl font-bold py-2 px-6 rounded mr-4"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              className="bg-green-500 text-white text-xl font-bold py-2 px-6 rounded"
            >
              ยืนยัน
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />
    </>
  );
}
