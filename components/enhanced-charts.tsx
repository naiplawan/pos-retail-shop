'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  Calendar,
  DollarSign,
  Package,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChartData {
  label: string;
  value: number;
  change?: number;
  color?: string;
  category?: string;
}

interface EnhancedChartsProps {
  salesData: ChartData[];
  productData: ChartData[];
  profitData: ChartData[];
}

export function EnhancedCharts({ salesData, productData, profitData }: EnhancedChartsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedChart, setSelectedChart] = useState('sales');

  const periods = [
    { value: '7d', label: '7 วันล่าสุด' },
    { value: '30d', label: '30 วันล่าสุด' },
    { value: '3m', label: '3 เดือนล่าสุด' },
    { value: '1y', label: '1 ปีล่าสุด' }
  ];

  const chartTypes = [
    { value: 'sales', label: 'ยอดขาย', icon: TrendingUp },
    { value: 'products', label: 'สินค้ายอดนิยม', icon: Package },
    { value: 'profit', label: 'กำไร', icon: DollarSign }
  ];

  // Mock enhanced data
  const mockSalesData = [
    { label: 'จันทร์', value: 12500, change: 8.5, color: '#3B82F6' },
    { label: 'อังคาร', value: 15200, change: 12.3, color: '#10B981' },
    { label: 'พุธ', value: 11800, change: -2.1, color: '#EF4444' },
    { label: 'พฤหัส', value: 18900, change: 24.7, color: '#10B981' },
    { label: 'ศุกร์', value: 21300, change: 15.2, color: '#10B981' },
    { label: 'เสาร์', value: 25600, change: 18.9, color: '#10B981' },
    { label: 'อาทิตย์', value: 19800, change: -8.3, color: '#EF4444' }
  ];

  const mockTopProducts = [
    { label: 'โค้ก 325ml', value: 156, change: 12.5, category: 'เครื่องดื่ม' },
    { label: 'มาม่า รสหมูสับ', value: 142, change: 8.3, category: 'อาหารแห้ง' },
    { label: 'น้ำดื่ม 600ml', value: 128, change: -3.2, category: 'เครื่องดื่ม' },
    { label: 'ขนมปังโฮลวีต', value: 95, change: 15.7, category: 'ขนม' },
    { label: 'ยาสีฟัน Darlie', value: 78, change: 5.1, category: 'ของใช้' }
  ];

  const renderTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const renderTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  const maxValue = Math.max(...mockSalesData.map(d => d.value));

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <Card className="bg-white border-2">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-indigo-700" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">
                  การวิเคราะห์ข้อมูล
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  ดูแนวโน้มและสถิติการขายแบบละเอียด
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={selectedChart} onValueChange={setSelectedChart}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chartTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                ส่งออก
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <Card className="lg:col-span-2 bg-white border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              กราฟยอดขายรายวัน
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Custom Bar Chart */}
            <div className="space-y-4">
              {mockSalesData.map((data, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium text-right">
                    {data.label}
                  </div>
                  <div className="flex-1 relative">
                    <div className="bg-gray-200 rounded-full h-8 relative overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-3 text-white text-sm font-semibold transition-all duration-1000"
                        style={{
                          width: `${(data.value / maxValue) * 100}%`,
                          backgroundColor: data.color
                        }}
                      >
                        {data.value.toLocaleString()} ฿
                      </div>
                    </div>
                  </div>
                  <div className="w-20 flex items-center gap-1">
                    {renderTrendIcon(data.change)}
                    <span className={cn("text-sm font-semibold", renderTrendColor(data.change))}>
                      {Math.abs(data.change).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">฿124.1K</div>
                <div className="text-sm text-gray-600">ยอดขายรวม</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">฿17.7K</div>
                <div className="text-sm text-gray-600">เฉลี่ยต่อวัน</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">+12.8%</div>
                <div className="text-sm text-gray-600">เพิ่มขึ้น</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">563</div>
                <div className="text-sm text-gray-600">รายการขาย</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Products Sidebar */}
        <Card className="bg-white border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              สินค้าขายดี
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTopProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-700 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{product.label}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{product.value}</div>
                    <div className={cn("text-xs flex items-center gap-1", renderTrendColor(product.change))}>
                      {renderTrendIcon(product.change)}
                      {Math.abs(product.change).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button className="w-full mt-4" variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              ดูทั้งหมด
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-green-800 mb-2">📈 แนวโน้มดี</h3>
                <p className="text-sm text-green-700">
                  ยอดขายเพิ่มขึ้น 12.8% เมื่อเทียบกับสัปดาห์ที่แล้ว
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-blue-800 mb-2">🎯 สินค้าฮิต</h3>
                <p className="text-sm text-blue-700">
                  โค้กและมาม่าเป็นสินค้าที่ขายดีที่สุดในสัปดาห์นี้
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-purple-800 mb-2">💡 คำแนะนำ</h3>
                <p className="text-sm text-purple-700">
                  ควรเพิ่มสต๊อกเครื่องดื่มในช่วงสุดสัปดาห์
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}