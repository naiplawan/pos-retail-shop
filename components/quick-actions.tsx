'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  Printer, 
  Package, 
  FileText,
  Calculator,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
  shortcut?: string;
}

interface QuickActionsProps {
  onAddProduct: () => void;
  onViewSales: () => void;
  onPrintReport: () => void;
  onSearch: () => void;
}

export function QuickActions({ 
  onAddProduct, 
  onViewSales, 
  onPrintReport, 
  onSearch 
}: QuickActionsProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const quickActions: QuickAction[] = [
    {
      id: 'add-product',
      title: 'เพิ่มสินค้าใหม่',
      description: 'บันทึกสินค้าเข้าระบบ',
      icon: <Plus className="h-8 w-8" />,
      color: 'bg-green-500 hover:bg-green-600',
      action: onAddProduct,
      shortcut: 'Ctrl+N'
    },
    {
      id: 'search',
      title: 'ค้นหาสินค้า',
      description: 'ค้นหาและดูข้อมูล',
      icon: <Search className="h-8 w-8" />,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: onSearch,
      shortcut: 'Ctrl+F'
    },
    {
      id: 'view-sales',
      title: 'ยอดขายวันนี้',
      description: 'ดูสรุปยอดขาย',
      icon: <TrendingUp className="h-8 w-8" />,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: onViewSales,
      shortcut: 'Ctrl+S'
    },
    {
      id: 'print-report',
      title: 'พิมพ์รายงาน',
      description: 'ออกรายงานการขาย',
      icon: <Printer className="h-8 w-8" />,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: onPrintReport,
      shortcut: 'Ctrl+P'
    }
  ];

  const handleActionClick = (action: QuickAction) => {
    toast.success(`${action.title} - กำลังดำเนินการ...`);
    action.action();
  };

  return (
    <Card className="bg-white border-2 shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Zap className="h-6 w-6 text-yellow-700" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-800">
              งานด่วน
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              คลิกเพื่อทำงานที่ใช้บ่อย ๆ
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="lg"
            className={cn(
              "h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-transparent transition-all duration-200 group relative overflow-hidden",
              hoveredAction === action.id && "scale-105 shadow-lg"
            )}
            onMouseEnter={() => setHoveredAction(action.id)}
            onMouseLeave={() => setHoveredAction(null)}
            onClick={() => handleActionClick(action)}
          >
            {/* Background color overlay */}
            <div className={cn(
              "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              action.color
            )} />
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-2 group-hover:text-white transition-colors">
              {action.icon}
              <div className="text-center">
                <div className="font-semibold text-sm">{action.title}</div>
                <div className="text-xs opacity-80">{action.description}</div>
              </div>
            </div>

            {/* Keyboard shortcut hint */}
            {action.shortcut && (
              <div className="absolute top-1 right-1 text-xs bg-gray-100 group-hover:bg-white/20 px-1.5 py-0.5 rounded opacity-60 group-hover:opacity-80 transition-all">
                {action.shortcut}
              </div>
            )}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

// Quick stats component for additional context
export function QuickStats() {
  const stats = [
    { label: 'สินค้าทั้งหมด', value: '248', icon: Package, color: 'text-blue-600' },
    { label: 'ยอดขายวันนี้', value: '12,450', unit: 'บาท', icon: Calculator, color: 'text-green-600' },
    { label: 'รายการขายวันนี้', value: '24', icon: FileText, color: 'text-purple-600' },
    { label: 'อัพเดทล่าสุด', value: '10:30', icon: Clock, color: 'text-orange-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white border hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-gray-100", stat.color)}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-lg text-gray-900">
                {stat.value} {stat.unit}
              </div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}