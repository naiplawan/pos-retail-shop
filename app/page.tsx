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

export default function Home() {
  const [refreshData, setRefreshData] = useState(0);
  const [formData, setFormData] = useState({
    productName: '',
    price: '',
    date: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConfirm = () => {
    toast.success('บันทึกข้อมูลสำเร็จ!');
    setFormData({ productName: '', price: '', date: '' });
    setIsModalOpen(false);
  };

  return (
    <>
      <main className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-center">
          ระบบจัดการร้านค้า
        </h1>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid grid-cols-5 mb-8">
            <TabsTrigger value="dashboard">แดชบอร์ด</TabsTrigger>
            <TabsTrigger value="add-price">เพิ่มรายการสินค้า</TabsTrigger>
            <TabsTrigger value="daily">สรุปยอดรายวัน</TabsTrigger>
            <TabsTrigger value="monthly">สรุปยอดรายเดือน</TabsTrigger>
            <TabsTrigger value="export">ส่งออกข้อมูล</TabsTrigger>
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
