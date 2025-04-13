'use client';
import { useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileText } from 'lucide-react';
import { ChecklistSheet } from '@/types';

// Define the item type for better type checking
export type ChecklistItem = {
  id: number;
  product_name: string;
  price: number;
  date: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  sheet_id?: number;
};

interface ChecklistTableProps {
  items: ChecklistItem[];
  sheets?: ChecklistSheet[];
  onViewItem?: (id: number) => void;
  onEditItem?: (id: number) => void;
  onDeleteItem?: (id: number) => void;
  exportAction?: (items?: ChecklistItem[]) => void;
}

export default function ChecklistTable({
  items,
  sheets,
  exportAction,
}: ChecklistTableProps) {
  // Ensure items and sheets are defined with default values
  const safeItems = items || [];
  const safeSheets = sheets || [];

  // State for modal functionality
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<ChecklistSheet | null>(
    null
  );
  const [sheetItems, setSheetItems] = useState<ChecklistItem[]>([]);

  // Format date with Thai locale
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: th });
    } catch (error) {
      return 'วันที่ไม่ถูกต้อง';
    }
  };

  // Calculate total price
  const calculateTotal = (price: number, quantity: number) => {
    // Check if price or quantity is undefined or null
    if (
      price === undefined ||
      price === null ||
      quantity === undefined ||
      quantity === null
    ) {
      return '0.00';
    }
    return (price * quantity).toFixed(2);
  };

  // Function to open sheet details modal
  const handleViewSheet = (sheet: ChecklistSheet) => {
    setSelectedSheet(sheet);

    // Filter items that belong to this sheet
    // First try by sheet_id if available, otherwise use date matching as fallback
    const filteredItems = safeItems.filter((item) => {
      if (item.sheet_id) {
        return item.sheet_id === sheet.id;
      }
      // Fallback to date matching
      return (
        new Date(item.created_at).toDateString() ===
        new Date(sheet.created_at).toDateString()
      );
    });

    setSheetItems(filteredItems);
    setIsSheetModalOpen(true);
  };

  // Function to handle exporting sheet items
  const handleExportSheetItems = () => {
    if (exportAction && sheetItems.length > 0) {
      exportAction(sheetItems);
      setIsSheetModalOpen(false);
    }
  };

  return (
    <div className="rounded-md border">
      {safeSheets.length > 0 && (
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-2">ใบออเดอร์สินค้า</h2>
          <ul className="space-y-1">
            {safeSheets.map((sheet) => (
              <li
                key={sheet.id}
                className="flex items-center justify-between bg-muted/20 rounded-md p-2"
              >
                <span>
                  {sheet.checklist_sheet_no} - {formatDate(sheet.created_at)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewSheet(sheet)}
                  className="flex items-center gap-1"
                >
                  <FileText className="h-4 w-4" />
                  <span>ดูรายละเอียด</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sheet Details Modal */}
      <Dialog open={isSheetModalOpen} onOpenChange={setIsSheetModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดใบสั่งซื้อ</DialogTitle>
            <DialogDescription>
              {selectedSheet && (
                <>
                  เลขที่: {selectedSheet.checklist_sheet_no} | วันที่:{' '}
                  {formatDate(selectedSheet.created_at)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead className="text-right">ราคา (บาท)</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">ราคารวม (บาท)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheetItems.length > 0 ? (
                  sheetItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-right">
                        {item.price !== undefined && item.price !== null
                          ? item.price.toFixed(2)
                          : '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {calculateTotal(item.price, item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      ไม่พบรายการสินค้าในใบสั่งซื้อนี้
                    </TableCell>
                  </TableRow>
                )}
                {/* Summary Row */}
                {sheetItems.length > 0 && (
                  <TableRow className="font-medium bg-muted/20">
                    <TableCell colSpan={3} className="text-right">
                      รวมทั้งสิ้น
                    </TableCell>
                    <TableCell className="text-right">
                      {sheetItems
                        .reduce((sum, item) => {
                          const price =
                            item.price !== undefined && item.price !== null
                              ? item.price
                              : 0;
                          const quantity =
                            item.quantity !== undefined &&
                            item.quantity !== null
                              ? item.quantity
                              : 0;
                          return sum + price * quantity;
                        }, 0)
                        .toFixed(2)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            {exportAction && sheetItems.length > 0 && (
              <Button variant="outline" onClick={handleExportSheetItems}>
                ส่งออก PDF
              </Button>
            )}
            <Button onClick={() => setIsSheetModalOpen(false)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
