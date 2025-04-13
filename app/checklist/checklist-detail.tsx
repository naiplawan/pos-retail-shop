'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import ChecklistTable, { ChecklistItem } from '@/app/checklist/checklist-table';
import ChecklistForm from '@/app/checklist/checklist-form';
import { Button } from '@/components/ui/button';
import { ChecklistSheet } from '@/types';

interface ChecklistDetailProps {
  initialItems?: ChecklistItem[];
  initialSheets?: ChecklistSheet[];
}

export default function ChecklistDetail({
  initialItems = [], // Default to an empty array if undefined
  initialSheets = [], // Default to an empty array if undefined
}: ChecklistDetailProps) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [sheets, setSheets] = useState<ChecklistSheet[]>(initialSheets);
  const [showModal, setShowModal] = useState(false);

  // Fetch sheets and items on component mount if not provided
  useEffect(() => {
    if (initialSheets.length === 0) {
      fetchChecklistSheets();
    }
    if (initialItems.length === 0) {
      fetchChecklistItems();
    }
  }, [initialSheets.length, initialItems.length]);

  // Function to fetch checklist sheets
  const fetchChecklistSheets = async () => {
    try {
      const response = await fetch('/api/checklist/sheets');
      if (!response.ok) {
        throw new Error('Failed to fetch checklist sheets');
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setSheets(data.data);
      }
    } catch (error) {
      console.error('Error fetching checklist sheets:', error);
      toast.error('ไม่สามารถดึงข้อมูลใบสั่งซื้อได้');
    }
  };

  // Function to fetch checklist items
  const fetchChecklistItems = async () => {
    try {
      const response = await fetch('/api/checklist/items');
      if (!response.ok) {
        throw new Error('Failed to fetch checklist items');
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Error fetching checklist items:', error);
      toast.error('ไม่สามารถดึงข้อมูลรายการสินค้าได้');
    }
  };

  const handleAddItems = async (
    newItems: {
      product_name: string;
      price: number;
      date: string;
      quantity: number;
    }[]
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (Array.isArray(newItems) && newItems.length > 0) {
        // Generate a new sheet number
        const sheetNo = `ORD-${Date.now().toString().substring(6)}`;

        // Add new sheet
        const newSheet: ChecklistSheet = {
          id: Date.now(),
          checklist_sheet_no: sheetNo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setSheets((prevSheets) => [...prevSheets, newSheet]);

        // Add new items
        const transformedItems: ChecklistItem[] = newItems.map(
          (item, index) => ({
            ...item,
            id: Date.now() + index, // Generate a unique ID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            checklist_sheet_id: newSheet.id, // Link items to the sheet
          })
        );

        setItems((prev) => [...prev, ...transformedItems]);
        toast.success('เพิ่มรายการสำเร็จ');
      }
      setShowModal(false);
      resolve();
    });
  };

  const handleDeleteItem = (id: number) => {
    if (window.confirm('คุณต้องการลบรายการนี้หรือไม่?')) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success('ลบรายการสำเร็จ');
    }
  };

  const exportToPdf = (itemsToExport?: ChecklistItem[]) => {
    // Use the provided items or default to all items
    const itemsToProcess = itemsToExport || items;

    if (itemsToProcess.length === 0) {
      toast.error('ไม่มีข้อมูลที่จะส่งออก');
      return;
    }

    try {
      import('@/lib/export').then(({ exportToPdf }) => {
        // Format the data for the PDF export
        const formattedItems = itemsToProcess.map((item) => ({
          ชื่อสินค้า: item.product_name,
          'ราคา (บาท)': item.price.toFixed(2),
          จำนวน: item.quantity,
          ราคารวม: (item.price * item.quantity).toFixed(2),
          วันที่: new Date(item.date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        }));

        // Define columns for the PDF table
        const columns = [
          { header: 'ชื่อสินค้า', accessor: 'ชื่อสินค้า' },
          { header: 'ราคา (บาท)', accessor: 'ราคา (บาท)' },
          { header: 'จำนวน', accessor: 'จำนวน' },
          { header: 'ราคารวม', accessor: 'ราคารวม' },
          { header: 'วันที่', accessor: 'วันที่' },
        ];

        // Calculate the total value
        const totalValue = itemsToProcess
          .reduce((sum, item) => sum + item.price * item.quantity, 0)
          .toFixed(2);

        // Add total row
        formattedItems.push({
          ชื่อสินค้า: 'รวมทั้งสิ้น',
          'ราคา (บาท)': '',
          จำนวน: 0,
          ราคารวม: totalValue,
          วันที่: '',
        });

        // Generate title based on whether we're exporting a specific sheet or all items
        const title =
          itemsToExport && itemsToExport.length !== items.length
            ? 'รายการใบสั่งซื้อเฉพาะ'
            : 'รายการใบสั่งซื้อสินค้าทั้งหมด';

        // Export to PDF
        exportToPdf({
          data: formattedItems,
          title: title,
          columns: columns,
        })
          .then(() => {
            toast.success('ส่งออก PDF สำเร็จ');
          })
          .catch((error) => {
            console.error('PDF export error:', error);
            toast.error('เกิดข้อผิดพลาดในการส่งออก PDF');
          });
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งออก PDF');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-y-2">
        <h2 className="text-xl font-bold">รายการใบสั่งซื้อ</h2>
        <div className="flex gap-x-2">
          <Button onClick={() => setShowModal(true)} className="text-white">
            เพิ่มรายการ
          </Button>
        </div>
      </div>

      {/* Modal for the form */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ChecklistForm
              onAddItem={handleAddItems}
              onClose={() => setShowModal(false)}
            />
          </div>
        </div>
      )}

      {/* Checklist Table with conditional rendering for empty state */}
      {items.length === 0 && sheets.length === 0 ? (
        <div className="p-8 text-center border rounded-md bg-muted/20">
          <p className="text-muted-foreground">ยังไม่มีรายการในระบบ</p>
        </div>
      ) : (
        <ChecklistTable
          items={items}
          sheets={sheets}
          onDeleteItem={handleDeleteItem}
          exportAction={exportToPdf}
        />
      )}
    </div>
  );
}
