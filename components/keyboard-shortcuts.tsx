'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Keyboard, 
  X, 
  Command,
  Search,
  Plus,
  Save,
  Printer,
  FileDown,
  RefreshCw,
  Settings,
  Home,
  ClipboardList,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showInfo } from '@/components/notification-system';

// Keyboard shortcut definition
interface KeyboardShortcut {
  id: string;
  key: string;
  description: string;
  category: string;
  action: () => void;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  global?: boolean;
}

interface ShortcutContextType {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  isHelpVisible: boolean;
  toggleHelp: () => void;
}

const ShortcutContext = createContext<ShortcutContextType | undefined>(undefined);

// Hook to use keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutProvider');
  }
  return context;
};

// Hook for registering individual shortcuts
export const useShortcut = (shortcut: Omit<KeyboardShortcut, 'id'>) => {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  const id = `shortcut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    registerShortcut({ ...shortcut, id });
    return () => unregisterShortcut(id);
  }, []);
};

// Shortcut help modal
function ShortcutHelp({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) {
  const { shortcuts } = useKeyboardShortcuts();

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    if (!groups[shortcut.category]) {
      groups[shortcut.category] = [];
    }
    groups[shortcut.category].push(shortcut);
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');
    parts.push(shortcut.key);
    return parts;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Keyboard className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">คีย์ลัด (Keyboard Shortcuts)</CardTitle>
                <p className="text-sm text-gray-600 mt-1">ใช้คีย์ลัดเพื่อทำงานได้เร็วขึ้น</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          <div className="grid gap-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3 text-gray-800">{category}</h3>
                <div className="grid gap-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {formatShortcut(shortcut).map((part, index) => (
                          <Badge key={index} variant="secondary" className="px-2 py-1 text-xs font-mono">
                            {part}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">เคล็ดลับ</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• กดปุ่ม ? เพื่อเปิด/ปิดหน้าต่างคีย์ลัด</li>
                  <li>• คีย์ลัดจะใช้งานได้ในทุกหน้า</li>
                  <li>• ถ้าคีย์ลัดไม่ทำงาน ลองคลิกที่หน้าเว็บก่อน</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Keyboard shortcut indicator
function ShortcutIndicator() {
  const { shortcuts, isHelpVisible, toggleHelp } = useKeyboardShortcuts();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 10000); // Auto-hide after 10 seconds
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible && !isHelpVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Card className="shadow-lg border-2">
        <CardContent className="p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleHelp}
            className="flex items-center gap-2 text-sm"
          >
            <Keyboard className="h-4 w-4" />
            <span>คีย์ลัด ({shortcuts.length})</span>
            <Badge variant="secondary" className="text-xs">?</Badge>
            {isVisible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                }}
                className="h-6 w-6 p-0 ml-2"
              >
                <EyeOff className="h-3 w-3" />
              </Button>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Main keyboard shortcut provider
export function KeyboardShortcutProvider({ 
  children,
  onNavigate,
  onAddProduct,
  onSearch,
  onSave,
  onPrint,
  onExport,
  onRefresh,
  onSettings
}: { 
  children: ReactNode;
  onNavigate?: (path: string) => void;
  onAddProduct?: () => void;
  onSearch?: () => void;
  onSave?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
}) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isHelpVisible, setIsHelpVisible] = useState(false);

  // Default global shortcuts
  useEffect(() => {
    const defaultShortcuts: KeyboardShortcut[] = [
      // Navigation
      {
        id: 'home',
        key: 'H',
        ctrl: true,
        description: 'ไปหน้าหลัก',
        category: 'การนำทาง',
        action: () => onNavigate?.('/'),
        global: true
      },
      {
        id: 'checklist',
        key: 'L',
        ctrl: true,
        description: 'ไปหน้าคำสั่งซื้อ',
        category: 'การนำทาง',
        action: () => onNavigate?.('/checklist'),
        global: true
      },

      // Actions
      {
        id: 'add-product',
        key: 'N',
        ctrl: true,
        description: 'เพิ่มสินค้าใหม่',
        category: 'การดำเนินการ',
        action: () => {
          onAddProduct?.();
          showSuccess('เปิดฟอร์มเพิ่มสินค้า', 'ใช้คีย์ลัด Ctrl+N');
        },
        global: true
      },
      {
        id: 'search',
        key: 'F',
        ctrl: true,
        description: 'ค้นหาสินค้า',
        category: 'การดำเนินการ',
        action: () => {
          onSearch?.();
          showInfo('เปิดการค้นหา', 'ใช้คีย์ลัด Ctrl+F');
        },
        global: true
      },
      {
        id: 'save',
        key: 'S',
        ctrl: true,
        description: 'บันทึกข้อมูล',
        category: 'การดำเนินการ',
        action: () => {
          onSave?.();
          showSuccess('บันทึกข้อมูลแล้ว', 'ใช้คีย์ลัด Ctrl+S');
        },
        global: true
      },
      {
        id: 'print',
        key: 'P',
        ctrl: true,
        description: 'พิมพ์รายงาน',
        category: 'การดำเนินการ',
        action: () => {
          onPrint?.();
          showInfo('เปิดการพิมพ์', 'ใช้คีย์ลัด Ctrl+P');
        },
        global: true
      },
      {
        id: 'export',
        key: 'E',
        ctrl: true,
        description: 'ส่งออกข้อมูล',
        category: 'การดำเนินการ',
        action: () => {
          onExport?.();
          showInfo('เปิดการส่งออก', 'ใช้คีย์ลัด Ctrl+E');
        },
        global: true
      },

      // System
      {
        id: 'refresh',
        key: 'R',
        ctrl: true,
        description: 'รีเฟรชข้อมูล',
        category: 'ระบบ',
        action: () => {
          onRefresh?.();
          showInfo('รีเฟรชข้อมูล', 'ใช้คีย์ลัด Ctrl+R');
        },
        global: true
      },
      {
        id: 'settings',
        key: ',',
        ctrl: true,
        description: 'เปิดการตั้งค่า',
        category: 'ระบบ',
        action: () => {
          onSettings?.();
          showInfo('เปิดการตั้งค่า', 'ใช้คีย์ลัด Ctrl+,');
        },
        global: true
      },

      // Help
      {
        id: 'help',
        key: '?',
        description: 'แสดง/ซ่อนคีย์ลัด',
        category: 'ช่วยเหลือ',
        action: () => setIsHelpVisible(prev => !prev),
        global: true
      },
    ];

    setShortcuts(prev => [...prev, ...defaultShortcuts]);

    // Cleanup function to remove default shortcuts
    return () => {
      setShortcuts(prev => prev.filter(s => !defaultShortcuts.some(ds => ds.id === s.id)));
    };
  }, [onNavigate, onAddProduct, onSearch, onSave, onPrint, onExport, onRefresh, onSettings]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as Element)?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const registerShortcut = (shortcut: KeyboardShortcut) => {
    setShortcuts(prev => [...prev, shortcut]);
  };

  const unregisterShortcut = (id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id));
  };

  const toggleHelp = () => {
    setIsHelpVisible(prev => !prev);
  };

  return (
    <ShortcutContext.Provider 
      value={{ 
        shortcuts, 
        registerShortcut, 
        unregisterShortcut, 
        isHelpVisible, 
        toggleHelp 
      }}
    >
      {children}
      <ShortcutIndicator />
      <ShortcutHelp isVisible={isHelpVisible} onClose={() => setIsHelpVisible(false)} />
    </ShortcutContext.Provider>
  );
}