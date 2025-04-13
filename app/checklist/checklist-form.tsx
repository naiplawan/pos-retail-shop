'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Validation schema using Zod
const checklistItemSchema = z.object({
  product_name: z.string().min(1, 'กรุณากรอกชื่อสินค้า'),
  price: z.coerce.number().min(0.01, 'ราคาต้องมากกว่า 0'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'วันที่ไม่ถูกต้อง'),
  quantity: z.coerce.number().min(1, 'จำนวนต้องมากกว่า 0'),
});

type ChecklistItem = z.infer<typeof checklistItemSchema>;

type ChecklistItemWithMeta = ChecklistItem & {
  id: number;
  created_at: string;
  updated_at: string;
};

interface ChecklistFormProps {
  onAddItem: (items: ChecklistItem[]) => Promise<void>;
  onClose: () => void;
}

export default function ChecklistForm({
  onAddItem,
  onClose,
}: ChecklistFormProps) {
  const formMethods = useForm<ChecklistItem>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      product_name: '',
      price: 1,
      date: new Date().toISOString().split('T')[0],
      quantity: 1,
    },
  });

  const [selectedItems, setSelectedItems] = useState<ChecklistItemWithMeta[]>(
    []
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const { reset, getValues, trigger } = formMethods;

  // Handle keypress to submit form with Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddItemToList();
    }
  };

  const handleAddItemToList = async () => {
    const isValid = await trigger();
    if (!isValid) {
      toast.error('กรุณากรอกข้อมูลให้ถูกต้อง');
      return;
    }

    const data = getValues();
    const newItem: ChecklistItemWithMeta = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSelectedItems((prevItems) => [...prevItems, newItem]);
    reset({
      product_name: '',
      price: 1,
      date: new Date().toISOString().split('T')[0],
      quantity: 1,
    });
  };

  const handleRemoveItem = (idToRemove: number) => {
    setItemToDelete(idToRemove);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete !== null) {
      setSelectedItems((prevItems) =>
        prevItems.filter((item) => item.id !== itemToDelete)
      );
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const onSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.warning('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    try {
      // Extract only the required fields for the API
      const itemsToSubmit = selectedItems.map((item) => ({
        product_name: item.product_name,
        price: item.price,
        date: item.date,
        quantity: item.quantity,
      }));

      const response = await fetch('/api/checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: itemsToSubmit }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Error adding items: ${response.statusText}`
        );
      }

      const { data } = await response.json();
      await onAddItem(data);
      setSelectedItems([]);
      reset();
      toast.success('บันทึกใบงานสำเร็จ');
      onClose();
    } catch (error) {
      console.error('Error submitting checklist:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'เกิดข้อผิดพลาดในการบันทึกใบงาน'
      );
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">สร้างใบงานการสั่งซื้อ</h3>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <FormProvider {...formMethods}>
            <div className="space-y-4" onKeyPress={handleKeyPress}>
              <FormField
                control={formMethods.control}
                name="product_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อสินค้า</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อสินค้า" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formMethods.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคา (บาท)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="ราคา (บาท)"
                        step="0.01"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? ''
                              : parseFloat(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formMethods.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวน</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="จำนวน"
                        step="1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? ''
                              : parseInt(e.target.value, 10)
                          )
                        }
                        min="1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formMethods.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันที่</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" onClick={handleAddItemToList}>
                  เพิ่มสินค้าในรายการ
                </Button>
              </div>
            </div>
          </FormProvider>
        </div>

        <div className="flex-1">
          <h4 className="text-lg font-bold mb-2">รายการที่จะบันทึก</h4>
          <div className="overflow-y-auto max-h-96 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">ราคารวม</TableHead>
                  <TableHead className="text-center">ลบ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.length > 0 ? (
                  selectedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-right">
                        {item.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.price * item.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          ลบ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      ยังไม่มีรายการสินค้า
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              ยกเลิกทั้งหมด
            </Button>
            <Button onClick={onSubmit} disabled={selectedItems.length === 0}>
              บันทึกใบงาน
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบสินค้า</DialogTitle>
            <DialogDescription>
              คุณต้องการลบสินค้านี้ออกจากรายการหรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              ยืนยันการลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
