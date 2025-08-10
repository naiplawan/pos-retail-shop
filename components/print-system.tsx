'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Printer, 
  FileText, 
  Download,
  Eye,
  Settings,
  Calendar,
  Receipt,
  BarChart3,
  Package,
  DollarSign,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/components/notification-system';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// Print template types
interface PrintTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: 'receipt' | 'report' | 'invoice' | 'inventory';
  pageSize: 'A4' | 'A5' | 'thermal';
}

interface PrintOptions {
  template: string;
  orientation: 'portrait' | 'landscape';
  pageSize: string;
  margins: string;
  includeLogo: boolean;
  includeDate: boolean;
  includePageNumbers: boolean;
  dateRange: {
    from: string;
    to: string;
  };
}

interface PrintData {
  title: string;
  subtitle?: string;
  data: any[];
  summary?: Record<string, any>;
  metadata?: Record<string, any>;
}

const templates: PrintTemplate[] = [
  {
    id: 'receipt',
    name: 'ใบเสร็จ',
    description: 'ใบเสร็จขนาดเล็กสำหรับเครื่องพิมพ์ความร้อน',
    icon: <Receipt className="h-5 w-5" />,
    type: 'receipt',
    pageSize: 'thermal'
  },
  {
    id: 'daily-report',
    name: 'รายงานรายวัน',
    description: 'สรุปยอดขายและการดำเนินการรายวัน',
    icon: <Calendar className="h-5 w-5" />,
    type: 'report',
    pageSize: 'A4'
  },
  {
    id: 'sales-report',
    name: 'รายงานการขาย',
    description: 'รายงานการขายแบบละเอียดตามช่วงเวลา',
    icon: <BarChart3 className="h-5 w-5" />,
    type: 'report',
    pageSize: 'A4'
  },
  {
    id: 'inventory-report',
    name: 'รายงานสต๊อก',
    description: 'รายการสินค้าคงเหลือและมูลค่า',
    icon: <Package className="h-5 w-5" />,
    type: 'inventory',
    pageSize: 'A4'
  },
  {
    id: 'financial-summary',
    name: 'สรุปการเงิน',
    description: 'รายงานกำไรขาดทุนและกระแสเงินสด',
    icon: <DollarSign className="h-5 w-5" />,
    type: 'report',
    pageSize: 'A4'
  }
];

export function PrintSystem({ onClose }: { onClose: () => void }) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    template: '',
    orientation: 'portrait',
    pageSize: 'A4',
    margins: 'normal',
    includeLogo: true,
    includeDate: true,
    includePageNumbers: true,
    dateRange: {
      from: format(new Date(), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd')
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Mock data for demonstration
  const mockData = {
    'daily-report': {
      title: 'รายงานการขายรายวัน',
      subtitle: `วันที่ ${format(new Date(), 'dd MMMM yyyy', { locale: th })}`,
      data: [
        { product: 'โค้ก 325ml', qty: 24, price: 15, total: 360 },
        { product: 'มาม่า รสหมูสับ', qty: 18, price: 8, total: 144 },
        { product: 'น้ำดื่ม 600ml', qty: 32, price: 5, total: 160 },
        { product: 'ขนมปังโฮลวีต', qty: 12, price: 25, total: 300 },
      ],
      summary: {
        totalItems: 86,
        totalValue: 964,
        profit: 289,
        profitMargin: '30%'
      }
    },
    'sales-report': {
      title: 'รายงานการขายแบบละเอียด',
      subtitle: `ระหว่างวันที่ ${format(new Date(), 'dd MMM', { locale: th })} - ${format(new Date(), 'dd MMM yyyy', { locale: th })}`,
      data: [
        { time: '09:30', product: 'โค้ก 325ml', customer: 'ลูกค้าทั่วไป', qty: 2, total: 30 },
        { time: '10:15', product: 'มาม่า รสหมูสับ', customer: 'ลูกค้าประจำ', qty: 5, total: 40 },
        { time: '11:45', product: 'น้ำดื่ม 600ml', customer: 'ลูกค้าใหม่', qty: 3, total: 15 },
      ],
      summary: {
        transactions: 48,
        customers: 32,
        avgTransaction: 28.50,
        totalRevenue: 1368
      }
    },
    'inventory-report': {
      title: 'รายงานสินค้าคงเหลือ',
      subtitle: `ข้อมูล ณ วันที่ ${format(new Date(), 'dd MMMM yyyy', { locale: th })}`,
      data: [
        { product: 'โค้ก 325ml', stock: 48, cost: 12, value: 576, status: 'ปกติ' },
        { product: 'มาม่า รสหมูสับ', stock: 120, cost: 6, value: 720, status: 'เหลือมาก' },
        { product: 'น้ำดื่ม 600ml', stock: 8, cost: 3, value: 24, status: 'เหลือน้อย' },
      ],
      summary: {
        totalProducts: 156,
        totalValue: 23840,
        lowStockItems: 12,
        outOfStockItems: 3
      }
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setPrintOptions(prev => ({ ...prev, template: templateId }));
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setPrintOptions(prev => ({
        ...prev,
        pageSize: template.pageSize === 'thermal' ? 'thermal' : 'A4'
      }));
    }
  };

  const generatePrintContent = (): string => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return '';

    const data = mockData[selectedTemplate as keyof typeof mockData];
    if (!data) return '';

    // Generate CSS styles
    const styles = `
      <style>
        @media print {
          body { margin: 0; padding: 20px; font-family: 'Sarabun', sans-serif; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
        body { 
          font-family: 'Sarabun', sans-serif; 
          line-height: 1.4; 
          color: #333;
          ${template.pageSize === 'thermal' ? 'width: 80mm; font-size: 12px;' : ''}
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #333; 
          padding-bottom: 15px; 
          margin-bottom: 20px; 
        }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
        .title { font-size: 18px; font-weight: bold; margin: 10px 0; }
        .subtitle { font-size: 14px; color: #666; margin-bottom: 15px; }
        .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .table th, .table td { 
          padding: 8px; 
          text-align: left; 
          border-bottom: 1px solid #ddd; 
        }
        .table th { 
          background-color: #f8f9fa; 
          font-weight: bold; 
          border-bottom: 2px solid #333;
        }
        .table tr:hover { background-color: #f5f5f5; }
        .summary { 
          background: #f8f9fa; 
          padding: 15px; 
          border-radius: 8px; 
          margin-top: 20px;
          border-left: 4px solid #2563eb;
        }
        .summary-item { 
          display: flex; 
          justify-content: space-between; 
          margin: 8px 0; 
          padding: 4px 0;
        }
        .summary-label { font-weight: bold; }
        .summary-value { color: #2563eb; font-weight: bold; }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          padding-top: 15px; 
          border-top: 1px solid #ddd; 
          font-size: 12px; 
          color: #666;
        }
        .thermal { width: 80mm; }
        .thermal .header { padding: 5px 0; margin-bottom: 10px; }
        .thermal .title { font-size: 16px; }
        .thermal .table th, .thermal .table td { padding: 4px; font-size: 11px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
      </style>
    `;

    // Generate HTML content based on template type
    let content = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
        ${styles}
      </head>
      <body class="${template.pageSize === 'thermal' ? 'thermal' : ''}">
    `;

    // Header
    if (printOptions.includeLogo || printOptions.includeDate) {
      content += `
        <div class="header">
          ${printOptions.includeLogo ? '<div class="logo">🏪 ร้านค้าของคุณ</div>' : ''}
          <div class="title">${data.title}</div>
          ${data.subtitle ? `<div class="subtitle">${data.subtitle}</div>` : ''}
          ${printOptions.includeDate ? `<div class="subtitle">พิมพ์เมื่อ: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: th })} น.</div>` : ''}
        </div>
      `;
    }

    // Content based on template type
    if (template.id === 'receipt') {
      content += `
        <div class="thermal-content">
          <div class="text-center">
            <div class="font-bold">ใบเสร็จรับเงิน</div>
            <div>No: ${Date.now().toString().slice(-6)}</div>
            <div>${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
          </div>
          <div style="margin: 15px 0; border-top: 1px dashed #333; border-bottom: 1px dashed #333; padding: 10px 0;">
            ${data.data.map((item: any) => `
              <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <div>${item.product}</div>
                <div>${item.total}฿</div>
              </div>
            `).join('')}
          </div>
          <div class="text-center font-bold">
            รวมทั้งสิ้น: ${data.summary?.totalValue || 0} บาท
          </div>
          <div class="text-center" style="margin-top: 15px;">
            <div>ขอบคุณที่ใช้บริการ</div>
            <div>โทร: 02-xxx-xxxx</div>
          </div>
        </div>
      `;
    } else {
      // Table content for reports
      content += `
        <table class="table">
          <thead>
            <tr>
      `;

      // Generate table headers based on template
      const headers = getTableHeaders(template.id);
      headers.forEach(header => {
        content += `<th>${header}</th>`;
      });

      content += `
            </tr>
          </thead>
          <tbody>
      `;

      // Generate table rows
      data.data.forEach((item: any) => {
        content += '<tr>';
        const values = getTableValues(template.id, item);
        values.forEach(value => {
          content += `<td>${value}</td>`;
        });
        content += '</tr>';
      });

      content += `
          </tbody>
        </table>
      `;

      // Summary section
      if (data.summary) {
        content += `
          <div class="summary">
            <div class="font-bold" style="margin-bottom: 10px;">สรุปข้อมูล</div>
        `;

        Object.entries(data.summary).forEach(([key, value]) => {
          const label = getSummaryLabel(key);
          content += `
            <div class="summary-item">
              <span class="summary-label">${label}</span>
              <span class="summary-value">${value}</span>
            </div>
          `;
        });

        content += '</div>';
      }
    }

    // Footer
    if (printOptions.includePageNumbers) {
      content += `
        <div class="footer">
          <div>ระบบจัดการร้านค้า - หน้า 1</div>
          <div>สร้างโดย POS System v1.0</div>
        </div>
      `;
    }

    content += `
        </body>
      </html>
    `;

    return content;
  };

  const getTableHeaders = (templateId: string): string[] => {
    switch (templateId) {
      case 'daily-report':
        return ['สินค้า', 'จำนวน', 'ราคา/หน่วย', 'รวม'];
      case 'sales-report':
        return ['เวลา', 'สินค้า', 'ลูกค้า', 'จำนวน', 'รวม'];
      case 'inventory-report':
        return ['สินค้า', 'คงเหลือ', 'ต้นทุน', 'มูลค่า', 'สถานะ'];
      default:
        return ['รายการ', 'จำนวน', 'ราคา', 'รวม'];
    }
  };

  const getTableValues = (templateId: string, item: any): string[] => {
    switch (templateId) {
      case 'daily-report':
        return [item.product, item.qty.toString(), `${item.price}฿`, `${item.total}฿`];
      case 'sales-report':
        return [item.time, item.product, item.customer, item.qty.toString(), `${item.total}฿`];
      case 'inventory-report':
        return [item.product, item.stock.toString(), `${item.cost}฿`, `${item.value}฿`, item.status];
      default:
        return [item.product || '', item.qty?.toString() || '', `${item.price || 0}฿`, `${item.total || 0}฿`];
    }
  };

  const getSummaryLabel = (key: string): string => {
    const labels: Record<string, string> = {
      totalItems: 'จำนวนสินค้าทั้งหมด',
      totalValue: 'มูลค่ารวม',
      profit: 'กำไร',
      profitMargin: 'เปอร์เซ็นต์กำไร',
      transactions: 'จำนวนรายการขาย',
      customers: 'จำนวนลูกค้า',
      avgTransaction: 'ค่าเฉลี่ยต่อรายการ',
      totalRevenue: 'รายได้รวม',
      totalProducts: 'จำนวนสินค้าทั้งหมด',
      lowStockItems: 'สินค้าเหลือน้อย',
      outOfStockItems: 'สินค้าหมด'
    };
    return labels[key] || key;
  };

  const handlePrint = () => {
    if (!selectedTemplate) {
      showError('กรุณาเลือกรูปแบบ', 'โปรดเลือกรูปแบบการพิมพ์ก่อน');
      return;
    }

    setIsGenerating(true);

    try {
      const printContent = generatePrintContent();
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
        
        showSuccess('กำลังพิมพ์', 'เอกสารถูกส่งไปยังเครื่องพิมพ์แล้ว');
      } else {
        showError('ไม่สามารถเปิดหน้าต่างพิมพ์ได้', 'กรุณาอนุญาตการเปิด popup');
      }
    } catch (error) {
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างเอกสารพิมพ์ได้');
      console.error('Print error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedTemplate) {
      showError('กรุณาเลือกรูปแบบ', 'โปรดเลือกรูปแบบก่อนดาวน์โหลด');
      return;
    }

    setIsGenerating(true);

    try {
      const printContent = generatePrintContent();
      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${templates.find(t => t.id === selectedTemplate)?.name || 'report'}-${format(new Date(), 'yyyy-MM-dd')}.html`;
      link.click();
      
      URL.revokeObjectURL(url);
      showSuccess('ดาวน์โหลดสำเร็จ', 'ไฟล์ถูกบันทึกในเครื่องแล้ว');
    } catch (error) {
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดได้');
      console.error('Download error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    if (!selectedTemplate) {
      showError('กรุณาเลือกรูปแบบ', 'โปรดเลือกรูปแบบก่อนดูตัวอย่าง');
      return;
    }

    const printContent = generatePrintContent();
    const previewWindow = window.open('', '_blank');
    
    if (previewWindow) {
      previewWindow.document.write(printContent);
      previewWindow.document.close();
    } else {
      showError('ไม่สามารถเปิดหน้าต่างตัวอย่างได้', 'กรุณาอนุญาตการเปิด popup');
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Printer className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">
                ระบบพิมพ์และรายงาน
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                สร้างและพิมพ์รายงานทุกประเภท
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            ปิด
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div>
          <Label className="text-base font-semibold mb-4 block">เลือกรูปแบบรายงาน</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg",
                  selectedTemplate === template.id 
                    ? "ring-2 ring-blue-500 bg-blue-50" 
                    : "hover:bg-gray-50"
                )}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{template.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs",
                          template.pageSize === 'thermal' 
                            ? "bg-orange-100 text-orange-700" 
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {template.pageSize}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                          {template.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Print Options */}
        {selectedTemplate && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="dateFrom">วันที่เริ่มต้น</Label>
              <Input
                id="dateFrom"
                type="date"
                value={printOptions.dateRange.from}
                onChange={(e) => setPrintOptions(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, from: e.target.value }
                }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="dateTo">วันที่สิ้นสุด</Label>
              <Input
                id="dateTo"
                type="date"
                value={printOptions.dateRange.to}
                onChange={(e) => setPrintOptions(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, to: e.target.value }
                }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="orientation">การวางกระดาษ</Label>
              <Select 
                value={printOptions.orientation} 
                onValueChange={(value: 'portrait' | 'landscape') => 
                  setPrintOptions(prev => ({ ...prev, orientation: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">แนวตั้ง</SelectItem>
                  <SelectItem value="landscape">แนวนอน</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="margins">ขอบกระดาษ</Label>
              <Select 
                value={printOptions.margins} 
                onValueChange={(value: string) => 
                  setPrintOptions(prev => ({ ...prev, margins: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">แคบ</SelectItem>
                  <SelectItem value="normal">ปกติ</SelectItem>
                  <SelectItem value="wide">กว้าง</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={printOptions.includeLogo}
                    onChange={(e) => setPrintOptions(prev => ({ 
                      ...prev, 
                      includeLogo: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">รวมโลโก้</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={printOptions.includeDate}
                    onChange={(e) => setPrintOptions(prev => ({ 
                      ...prev, 
                      includeDate: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">รวมวันที่</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={printOptions.includePageNumbers}
                    onChange={(e) => setPrintOptions(prev => ({ 
                      ...prev, 
                      includePageNumbers: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">รวมเลขหน้า</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={!selectedTemplate || isGenerating}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            ดูตัวอย่าง
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={!selectedTemplate || isGenerating}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            ดาวน์โหลด
          </Button>
          
          <Button
            onClick={handlePrint}
            disabled={!selectedTemplate || isGenerating}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            {isGenerating ? 'กำลังสร้าง...' : 'พิมพ์'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}