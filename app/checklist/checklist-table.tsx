'use client';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { exportToPdf } from '@/lib/export';
import { ExportColumn } from '@/types';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';

// Define the item type for better type checking
export type ChecklistItem = {
  id: number;
  product_name: string;
  price: number;
  date: string;
  quantity: number;
  created_at: string;
  updated_at: string;
};

interface ChecklistTableProps {
  items: ChecklistItem[];
  onViewItem?: (id: number) => void;
  onEditItem?: (id: number) => void;
  onDeleteItem?: (id: number) => void;
}

export default function ChecklistTable({
  items,
  onViewItem,
  onEditItem,
  onDeleteItem,
}: ChecklistTableProps) {
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
    return (price * quantity).toFixed(2);
  };

  // Add a computed field for total price
  const itemsWithTotalPrice = items.map((item) => ({
    ...item,
    total_price: item.price * item.quantity,
  }));

  // Add a function to handle PDF export
  const handleExportToPdf = async () => {
    const columns: ExportColumn[] = [
      { header: 'เลขที่ใบสั่งซื้อ', accessor: 'id' },
      { header: 'ชื่อสินค้า', accessor: 'product_name' },
      {
        header: 'ราคา (บาท)',
        accessor: 'price',
        format: (value) => value.toFixed(2),
      },
      { header: 'จำนวน', accessor: 'quantity' },
      {
        header: 'ราคารวม (บาท)',
        accessor: 'total_price',
        format: (value) => value.toFixed(2),
      },
      {
        header: 'วันที่สั่งซื้อ',
        accessor: 'created_at',
        format: (value) => formatDate(value),
      },
    ];

    try {
      await exportToPdf({
        data: itemsWithTotalPrice,
        title: 'Checklist Export',
        columns,
      });
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  return (
    <div className="rounded-md border">
      <div className="flex justify-end p-4">
        <Button onClick={handleExportToPdf} variant="default">
          Export to PDF
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">เลขที่ใบสั่งซื้อ</TableHead>
            <TableHead>ชื่อสินค้า</TableHead>
            <TableHead className="text-right">ราคา (บาท)</TableHead>
            <TableHead className="text-right">จำนวน</TableHead>
            <TableHead className="text-right">ราคารวม (บาท)</TableHead>
            <TableHead>วันที่สั่งซื้อ</TableHead>
            {(onViewItem || onEditItem || onDeleteItem) && (
              <TableHead className="w-[80px]">จัดการ</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length > 0 ? (
            itemsWithTotalPrice.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.product_name}</TableCell>
                <TableCell className="text-right">
                  {item.price.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {calculateTotal(item.price, item.quantity)}
                </TableCell>
                <TableCell>{formatDate(item.created_at)}</TableCell>
                {(onViewItem || onEditItem || onDeleteItem) && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <span className="sr-only">เปิดเมนู</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onViewItem && (
                          <DropdownMenuItem onClick={() => onViewItem(item.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>ดูรายละเอียด</span>
                          </DropdownMenuItem>
                        )}
                        {onEditItem && (
                          <DropdownMenuItem onClick={() => onEditItem(item.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>แก้ไข</span>
                          </DropdownMenuItem>
                        )}
                        {onDeleteItem && (
                          <DropdownMenuItem
                            onClick={() => onDeleteItem(item.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>ลบ</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={onViewItem || onEditItem || onDeleteItem ? 7 : 6}
                className="h-24 text-center text-muted-foreground"
              >
                ไม่มีรายการสินค้า
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
