'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  BarChart3,
  DollarSign,
  Calendar,
  Eye,
  ShoppingCart,
  Package2,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError, showWarning } from '@/components/notification-system';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// Types
interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  costPrice: number;
  sellPrice: number;
  supplier: string;
  lastRestocked: Date;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'discontinued';
  location: string;
  notes?: string;
}

interface StockAlert {
  id: string;
  itemId: string;
  itemName: string;
  type: 'low-stock' | 'out-of-stock' | 'overstock';
  currentStock: number;
  threshold: number;
  severity: 'high' | 'medium' | 'low';
  createdAt: Date;
}

// Mock data
const mockInventoryData: InventoryItem[] = [
  {
    id: '1',
    name: 'โค้ก 325ml',
    sku: 'COKE325',
    category: 'เครื่องดื่ม',
    currentStock: 48,
    minStock: 20,
    maxStock: 100,
    costPrice: 12,
    sellPrice: 15,
    supplier: 'บริษัท โค้ก',
    lastRestocked: new Date('2024-01-15'),
    status: 'in-stock',
    location: 'ชั้น A1'
  },
  {
    id: '2',
    name: 'มาม่า รสหมูสับ',
    sku: 'MAMA001',
    category: 'อาหารแห้ง',
    currentStock: 8,
    minStock: 15,
    maxStock: 60,
    costPrice: 6,
    sellPrice: 8,
    supplier: 'บริษัท มาม่า',
    lastRestocked: new Date('2024-01-10'),
    status: 'low-stock',
    location: 'ชั้น B2'
  },
  {
    id: '3',
    name: 'น้ำดื่ม 600ml',
    sku: 'WATER600',
    category: 'เครื่องดื่ม',
    currentStock: 0,
    minStock: 12,
    maxStock: 80,
    costPrice: 3,
    sellPrice: 5,
    supplier: 'บริษัท น้ำดื่ม',
    lastRestocked: new Date('2024-01-05'),
    status: 'out-of-stock',
    location: 'ชั้น A2'
  },
  {
    id: '4',
    name: 'ขนมปังโฮลวีต',
    sku: 'BREAD001',
    category: 'ขนม',
    currentStock: 25,
    minStock: 10,
    maxStock: 40,
    costPrice: 18,
    sellPrice: 25,
    supplier: 'เบเกอรี่ ABC',
    lastRestocked: new Date('2024-01-12'),
    status: 'in-stock',
    location: 'ชั้น C1'
  },
  {
    id: '5',
    name: 'ยาสีฟัน Darlie',
    sku: 'TOOTH001',
    category: 'ของใช้',
    currentStock: 15,
    minStock: 5,
    maxStock: 30,
    costPrice: 28,
    sellPrice: 35,
    supplier: 'บริษัท Darlie',
    lastRestocked: new Date('2024-01-08'),
    status: 'in-stock',
    location: 'ชั้น D1'
  }
];

export function InventoryManager() {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>(mockInventoryData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value' | 'lastRestocked'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalItems = inventoryData.length;
    const totalValue = inventoryData.reduce((sum, item) => sum + (item.currentStock * item.costPrice), 0);
    const lowStockItems = inventoryData.filter(item => item.status === 'low-stock').length;
    const outOfStockItems = inventoryData.filter(item => item.status === 'out-of-stock').length;
    const categories = [...new Set(inventoryData.map(item => item.category))].length;
    
    return {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      categories,
      averageValue: totalValue / totalItems || 0
    };
  }, [inventoryData]);

  // Generate alerts
  const alerts = useMemo((): StockAlert[] => {
    return inventoryData
      .filter(item => item.currentStock <= item.minStock)
      .map(item => ({
        id: `alert-${item.id}`,
        itemId: item.id,
        itemName: item.name,
        type: item.currentStock === 0 ? 'out-of-stock' as const : 'low-stock' as const,
        currentStock: item.currentStock,
        threshold: item.minStock,
        severity: item.currentStock === 0 ? 'high' as const : 
                 item.currentStock <= item.minStock * 0.5 ? 'medium' as const : 'low' as const,
        createdAt: new Date()
      }));
  }, [inventoryData]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = inventoryData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      const matchesStatus = !selectedStatus || item.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'stock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        case 'value':
          aValue = a.currentStock * a.costPrice;
          bValue = b.currentStock * b.costPrice;
          break;
        case 'lastRestocked':
          aValue = a.lastRestocked.getTime();
          bValue = b.lastRestocked.getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [inventoryData, searchQuery, selectedCategory, selectedStatus, sortBy, sortOrder]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-800';
      case 'low-stock': return 'bg-yellow-100 text-yellow-800';
      case 'out-of-stock': return 'bg-red-100 text-red-800';
      case 'discontinued': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in-stock': return 'มีสต๊อก';
      case 'low-stock': return 'สต๊อกน้อย';
      case 'out-of-stock': return 'หมดสต๊อก';
      case 'discontinued': return 'ยกเลิก';
      default: return status;
    }
  };

  const handleQuickRestock = (itemId: string) => {
    const item = inventoryData.find(i => i.id === itemId);
    if (!item) return;

    const restockAmount = item.maxStock - item.currentStock;
    
    setInventoryData(prev => prev.map(i => 
      i.id === itemId 
        ? { ...i, currentStock: i.maxStock, lastRestocked: new Date(), status: 'in-stock' as const }
        : i
    ));

    showSuccess(`เติมสต๊อก ${item.name}`, `เติมจำนวน ${restockAmount} หน่วย`);
  };

  const handleDeleteItem = (itemId: string) => {
    const item = inventoryData.find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`ต้องการลบ "${item.name}" หรือไม่?`)) {
      setInventoryData(prev => prev.filter(i => i.id !== itemId));
      showSuccess('ลบสินค้าสำเร็จ', `ได้ลบ ${item.name} ออกจากระบบแล้ว`);
    }
  };

  const exportInventoryData = () => {
    const csvContent = [
      ['ชื่อสินค้า', 'รหัสสินค้า', 'หมวดหมู่', 'สต๊อกปัจจุบัน', 'สต๊อกขั้นต่ำ', 'ราคาต้นทุน', 'ราคาขาย', 'สถานะ'].join(','),
      ...filteredData.map(item => [
        item.name,
        item.sku,
        item.category,
        item.currentStock,
        item.minStock,
        item.costPrice,
        item.sellPrice,
        getStatusLabel(item.status)
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    showSuccess('ส่งออกสำเร็จ', 'ไฟล์ CSV ถูกดาวน์โหลดแล้ว');
  };

  const categories = [...new Set(inventoryData.map(item => item.category))];
  const statuses = ['in-stock', 'low-stock', 'out-of-stock', 'discontinued'];

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-white border-2">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{statistics.totalItems}</div>
            <div className="text-sm text-gray-600">รายการทั้งหมด</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">฿{statistics.totalValue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">มูลค่ารวม</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{statistics.lowStockItems}</div>
            <div className="text-sm text-gray-600">สต๊อกน้อย</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2">
          <CardContent className="p-4 text-center">
            <Package2 className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{statistics.outOfStockItems}</div>
            <div className="text-sm text-gray-600">หมดสต๊อก</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{statistics.categories}</div>
            <div className="text-sm text-gray-600">หมวดหมู่</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">฿{statistics.averageValue.toFixed(0)}</div>
            <div className="text-sm text-gray-600">ค่าเฉลี่ย</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg text-red-800">แจ้งเตือนสต๊อก ({alerts.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-red-800">{alert.itemName}</div>
                    <div className="text-sm text-red-600">
                      {alert.type === 'out-of-stock' ? 'หมดสต๊อก' : `เหลือ ${alert.currentStock} หน่วย (ต่ำกว่า ${alert.threshold})`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleQuickRestock(alert.itemId)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    เติมด่วน
                  </Button>
                </div>
              ))}
              {alerts.length > 5 && (
                <div className="text-center py-2">
                  <Button variant="outline" size="sm">
                    ดูทั้งหมด ({alerts.length - 5} รายการ)
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card className="bg-white border-2">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold text-gray-800">
              จัดการคลังสินค้า
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มสินค้า
              </Button>
              <Button variant="outline" onClick={exportInventoryData}>
                <Download className="h-4 w-4 mr-2" />
                ส่งออก
              </Button>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                นำเข้า
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหาสินค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="หมวดหมู่ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">หมวดหมู่ทั้งหมด</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="สถานะทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">สถานะทั้งหมด</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as any);
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="เรียงตาม" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">ชื่อ A-Z</SelectItem>
                <SelectItem value="name-desc">ชื่อ Z-A</SelectItem>
                <SelectItem value="stock-asc">สต๊อกน้อย-มาก</SelectItem>
                <SelectItem value="stock-desc">สต๊อกมาก-น้อย</SelectItem>
                <SelectItem value="value-desc">มูลค่าสูง-ต่ำ</SelectItem>
                <SelectItem value="lastRestocked-desc">เติมล่าสุด</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary */}
          <div className="mb-4 text-sm text-gray-600">
            แสดง {filteredData.length} จาก {inventoryData.length} รายการ
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-semibold">สินค้า</th>
                  <th className="text-center p-3 font-semibold">สต๊อก</th>
                  <th className="text-right p-3 font-semibold">มูลค่า</th>
                  <th className="text-center p-3 font-semibold">สถานะ</th>
                  <th className="text-center p-3 font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          {item.sku} • {item.category}
                        </div>
                        <div className="text-xs text-gray-500">
                          ตำแหน่ง: {item.location}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="font-bold text-lg">
                        {item.currentStock}
                      </div>
                      <div className="text-xs text-gray-500">
                        ขั้นต่ำ: {item.minStock}
                      </div>
                      {item.currentStock <= item.minStock && (
                        <div className="w-full bg-red-200 rounded-full h-1 mt-1">
                          <div 
                            className="bg-red-600 h-1 rounded-full"
                            style={{ width: `${Math.min((item.currentStock / item.minStock) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="font-bold">
                        ฿{(item.currentStock * item.costPrice).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        @ ฿{item.costPrice}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {item.currentStock <= item.minStock && (
                          <Button 
                            size="sm"
                            onClick={() => handleQuickRestock(item.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <div>ไม่พบข้อมูลสินค้า</div>
                <div className="text-sm">ลองปรับเปลี่ยนเงื่อนไขการค้นหา</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}