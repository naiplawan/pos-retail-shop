'use client';
import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Form,
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

// Define Zod schema for validation
const checklistItemSchema = z.object({
  product_name: z.string().min(1, 'กรุณากรอกชื่อสินค้า'),
  // Use coerce for number inputs as they often come as strings
  price: z.coerce.number().min(0.01, 'ราคาต้องมากกว่า 0'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'วันที่ไม่ถูกต้อง'),
  // Use coerce for number inputs
  quantity: z.coerce.number().min(1, 'จำนวนต้องมากกว่า 0'),
});

// Infer the TypeScript type from the Zod schema
type ChecklistItem = z.infer<typeof checklistItemSchema>;

// Type for items added to the list, including temporary client-side ID and timestamps
type ChecklistItemWithMeta = ChecklistItem & {
  id: number; // Using number for client-side temporary ID (Date.now())
  created_at: string;
  updated_at: string;
};

interface ChecklistFormProps {
  // Expecting the final items as returned by the API (likely without meta)
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
      date: new Date().toISOString().split('T')[0], // Keep date format consistent
      quantity: 1,
    },
  });
  // State should hold items with metadata
  const [selectedItems, setSelectedItems] = useState<ChecklistItemWithMeta[]>(
    []
  );
  const { reset, getValues, trigger } = formMethods;

  // Function to add a single validated item to the temporary list
  const handleAddItemToList = async () => {
    // Trigger validation before getting values
    const isValid = await trigger();
    if (!isValid) {
      toast.error('กรุณากรอกข้อมูลให้ถูกต้อง');
      return;
    }

    const data = getValues();
    const newItem: ChecklistItemWithMeta = {
      ...data,
      id: Date.now(), // Use timestamp as a temporary unique key
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSelectedItems((prevItems) => [...prevItems, newItem]);
    // Reset the form for the next item
    reset({
      product_name: '',
      price: 1,
      date: new Date().toISOString().split('T')[0], // Reset date as well
      quantity: 1,
    });
  };

  const handleRemoveItem = (idToRemove: number) => {
    if (window.confirm('คุณต้องการลบสินค้านี้หรือไม่?')) {
      setSelectedItems((prevItems) =>
        prevItems.filter((item) => item.id !== idToRemove)
      );
    }
  };

  // In the onSubmit function:

  const onSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.warning('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    // Prepare data for API: remove client-side meta fields
    const itemsToSubmit = selectedItems.map(
      ({ id, created_at, updated_at, ...item }) => item
    );

    try {
      const responses = await Promise.all(
        itemsToSubmit.map(async (item) => {
          const response = await fetch('/api/checklist', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || `Error adding item: ${response.statusText}`
            );
          }

          return response.json();
        })
      );

      // Extract created items from API responses
      const createdItems = responses
        .filter((res) => res.success)
        .map((res) => res.data)
        .flat();

      if (createdItems.length > 0) {
        onAddItem(createdItems);
        setSelectedItems([]);
        reset();
        toast.success('บันทึกใบงานสำเร็จ');
        onClose();
      } else {
        toast.error('ไม่สามารถบันทึกรายการได้');
      }
    } catch (error) {
      console.error('Error submitting checklist:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'เกิดข้อผิดพลาดในการบันทึกใบงาน';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="p-4" onClick={onClose}>
      <h3 className="text-lg font-bold mb-4">สร้างใบงานการสั่งซื้อ</h3>
      <div className="flex flex-col md:flex-row min-w-[300px] md:min-w-[600px] lg:min-w-[800px] gap-8">
        {/* Input Form */}
        <div className="flex-1 min-w-0">
          {/* Use FormProvider */}
          <FormProvider {...formMethods}>
            {/* The form element itself doesn't need onSubmit if using a separate button for adding */}
            <Form {...formMethods}>
              {/* Use a div or fragment instead of nested form */}
              <div className="space-y-4">
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
                          step="0.01" // Allow decimals for price
                          {...field}
                          // Ensure value is treated as number
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
                          step="1" // Whole numbers for quantity
                          {...field}
                          // Ensure value is treated as number
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? ''
                                : parseInt(e.target.value, 10)
                            )
                          }
                          min="1" // HTML5 validation
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
                        {/* Keep date read-only as it's defaulted */}
                        <Input type="date" readOnly {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  {/* Button to add item to the list */}
                  <Button type="button" onClick={handleAddItemToList}>
                    เพิ่มสินค้าในรายการ
                  </Button>
                </div>
              </div>
            </Form>
          </FormProvider>
        </div>

        {/* Shopping Cart / Selected Items List */}
        <div className="flex-1 min-w-0">
          <div>
            <h4 className="text-lg font-bold mb-2">รายการที่จะบันทึก</h4>
            <div className="overflow-y-auto max-h-96 border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50 z-10">
                  <TableRow>
                    <TableHead className="text-left">ชื่อสินค้า</TableHead>
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
                        <TableCell className="font-medium">
                          {item.product_name}
                        </TableCell>
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
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        ยังไม่มีรายการสินค้า
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Buttons outside the table container */}
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                ยกเลิกทั้งหมด
              </Button>
              {/* Button to submit the whole list */}
              <Button onClick={onSubmit} disabled={selectedItems.length === 0}>
                บันทึกใบงาน
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
