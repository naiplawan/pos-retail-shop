'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  Calendar,
  DollarSign,
  Tag,
  X,
  Clock,
  Barcode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchFilters {
  query: string;
  category: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
}

interface SearchResult {
  id: string;
  productName: string;
  price: number;
  date: string;
  category?: string;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  isLoading?: boolean;
  results?: SearchResult[];
}

export function AdvancedSearch({ 
  onSearch, 
  onClear, 
  isLoading = false,
  results = [] 
}: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    priceMin: '',
    priceMax: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Mock data for suggestions and categories
  const categories = [
    'เครื่องดื่ม', 'ขนม', 'อาหารแห้ง', 'ของใช้', 'เครื่องเขียน', 'อื่นๆ'
  ];

  const mockSuggestions = [
    'โค้ก', 'เป็ปซี่', 'น้ำดื่ม', 'มาม่า', 'ลูกอม', 'ยาสีฟัน'
  ];

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Filter suggestions based on query
    if (filters.query.length > 0) {
      const filtered = mockSuggestions.filter(item => 
        item.toLowerCase().includes(filters.query.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [filters.query]);

  const handleSearch = () => {
    if (filters.query.trim()) {
      // Save to recent searches
      const updated = [filters.query, ...recentSearches.filter(s => s !== filters.query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
    
    onSearch(filters);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setFilters({
      query: '',
      category: '',
      priceMin: '',
      priceMax: '',
      dateFrom: '',
      dateTo: ''
    });
    onClear();
    setShowSuggestions(false);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRecentSearchClick = (search: string) => {
    setFilters(prev => ({ ...prev, query: search }));
    setTimeout(handleSearch, 100);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFilters(prev => ({ ...prev, query: suggestion }));
    setShowSuggestions(false);
  };

  const getActiveFiltersCount = () => {
    return Object.entries(filters).filter(([key, value]) => 
      key !== 'query' && value.trim() !== ''
    ).length;
  };

  return (
    <Card className="bg-white border-2 shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Search className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">
                ค้นหาสินค้า
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                ค้นหาด้วยชื่อสินค้าหรือสแกนบาร์โค้ด
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            ตัวกรอง
            {getActiveFiltersCount() > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 text-xs">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main search input */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                ref={searchRef}
                placeholder="ค้นหาสินค้า... (ลองพิมพ์ 'โค้ก' หรือ 'มาม่า')"
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-10 h-12 text-base"
                onFocus={() => filters.query && setShowSuggestions(true)}
              />
              {filters.query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFilterChange('query', '')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Button 
              onClick={handleSearch}
              size="lg"
              className="px-6"
              disabled={isLoading}
            >
              <Search className="h-5 w-5 mr-2" />
              ค้นหา
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="px-6"
            >
              <Barcode className="h-5 w-5 mr-2" />
              สแกน
            </Button>
          </div>

          {/* Search suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
              <div className="p-2">
                <div className="text-xs text-gray-500 mb-2">คำแนะนำ</div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    <Search className="h-4 w-4 inline mr-2 text-gray-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent searches */}
        {recentSearches.length > 0 && !filters.query && (
          <div className="flex flex-wrap gap-2 items-center">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">ค้นหาล่าสุด:</span>
            {recentSearches.map((search, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => handleRecentSearchClick(search)}
              >
                {search}
              </Badge>
            ))}
          </div>
        )}

        {/* Advanced filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">หมวดหมู่</label>
              <Select 
                value={filters.category} 
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">ราคาต่ำสุด</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">ราคาสูงสุด</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="∞"
                  value={filters.priceMax}
                  onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">วันที่เริ่มต้น</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">วันที่สิ้นสุด</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={handleClear}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                ล้างตัวกรอง
              </Button>
            </div>
          </div>
        )}

        {/* Search results */}
        {results.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-3">ผลการค้นหา ({results.length} รายการ)</h3>
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <div className="font-medium">{result.productName}</div>
                    <div className="text-sm text-gray-600">
                      {result.category && (
                        <Badge variant="outline" className="mr-2">
                          {result.category}
                        </Badge>
                      )}
                      {new Date(result.date).toLocaleDateString('th-TH')}
                    </div>
                  </div>
                  <div className="font-bold text-green-600">
                    ฿{result.price.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}