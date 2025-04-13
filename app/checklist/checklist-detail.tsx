'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import ChecklistTable from '@/app/checklist/checklist-table';
import ChecklistForm from '@/app/checklist/checklist-form';
import { Button } from '@/components/ui/button';

// Define the ChecklistItem type
interface ChecklistItem {
  id: number;
  product_name: string;
  price: number;
  date: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

interface ChecklistDetailProps {
  initialItems: ChecklistItem[];
}

export default function ChecklistDetail({
  initialItems = [], // Default to an empty array if undefined
}: ChecklistDetailProps) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [showModal, setShowModal] = useState(false);

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
        const transformedItems: ChecklistItem[] = newItems.map(
          (item, index) => ({
            ...item,
            id: Date.now() + index, // Generate a unique ID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-y-2">
        <h2 className="text-xl font-bold">รายการใบสั่งซื้อ</h2>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-green-500 hover:bg-green-600"
        >
          เพิ่มรายการ
        </Button>
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
      {items.length === 0 ? (
        <div className="p-8 text-center border rounded-md bg-muted/20">
          <p className="text-muted-foreground">ยังไม่มีรายการในระบบ</p>
        </div>
      ) : (
        <ChecklistTable items={items} onDeleteItem={handleDeleteItem} />
      )}
    </div>
  );
}
