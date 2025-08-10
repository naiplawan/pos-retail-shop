'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Info, 
  X, 
  Wifi,
  WifiOff,
  Save,
  Clock,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
  progress?: number;
  autoClose?: boolean;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Custom hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Enhanced toast functions
export const showSuccess = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
  toast.success(title, {
    description: message,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined,
    duration: 4000,
  });
};

export const showError = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
  toast.error(title, {
    description: message,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined,
    duration: 6000,
  });
};

export const showWarning = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
  toast.warning(title, {
    description: message,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined,
    duration: 5000,
  });
};

export const showInfo = (title: string, message?: string, action?: { label: string; onClick: () => void }) => {
  toast.info(title, {
    description: message,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined,
    duration: 4000,
  });
};

// Loading toast with progress
export const showLoading = (title: string, message?: string): string => {
  const id = `loading-${Date.now()}`;
  toast.loading(title, {
    id,
    description: message,
  });
  return id;
};

export const updateLoading = (id: string, title: string, message?: string, progress?: number) => {
  toast.loading(title, {
    id,
    description: message ? (
      <div className="space-y-2">
        <p>{message}</p>
        {progress !== undefined && (
          <Progress value={progress} className="h-2" />
        )}
      </div>
    ) : undefined,
  });
};

export const dismissLoading = (id: string, success: boolean, title: string, message?: string) => {
  toast.dismiss(id);
  if (success) {
    showSuccess(title, message);
  } else {
    showError(title, message);
  }
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        showSuccess('เชื่อมต่ออินเทอร์เน็ตแล้ว', 'ข้อมูลจะถูกซิงค์อัตโนมัติ');
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      showWarning('ไม่มีการเชื่อมต่ออินเทอร์เน็ต', 'ระบบจะทำงานแบบออฟไลน์');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
};

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class NotificationErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ error, errorInfo });
    
    // Log error and show notification
    console.error('Error caught by boundary:', error, errorInfo);
    showError(
      'เกิดข้อผิดพลาดในระบบ',
      'กรุณาลองรีเฟรชหน้าเว็บ หรือติดต่อผู้ดูแลระบบ',
      {
        label: 'รีเฟรช',
        onClick: () => window.location.reload()
      }
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card className="m-4 border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-red-700 mb-4">ระบบประสบปัญหาและไม่สามารถแสดงผลได้</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline">
                รีเฟรชหน้าเว็บ
              </Button>
              <Button onClick={() => this.setState({ hasError: false })}>
                ลองใหม่
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// System status component
export function SystemStatus() {
  const { isOnline } = useNetworkStatus();
  const [systemLoad, setSystemLoad] = useState(15);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemLoad(Math.random() * 30 + 10);
      if (isOnline) {
        setLastSync(new Date());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const getSystemStatus = () => {
    if (!isOnline) return { color: 'red', label: 'ออฟไลน์', icon: WifiOff };
    if (systemLoad > 80) return { color: 'red', label: 'ช้า', icon: AlertTriangle };
    if (systemLoad > 60) return { color: 'yellow', label: 'ปานกลาง', icon: Clock };
    return { color: 'green', label: 'ดี', icon: Zap };
  };

  const status = getSystemStatus();

  return (
    <Card className="fixed bottom-4 right-4 z-40 shadow-lg">
      <CardContent className="p-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <status.icon className={cn("h-4 w-4", 
              status.color === 'green' && "text-green-600",
              status.color === 'yellow' && "text-yellow-600",
              status.color === 'red' && "text-red-600"
            )} />
            <span className="font-medium">ระบบ: {status.label}</span>
          </div>
          
          <div className="flex items-center gap-1 text-gray-600">
            <Save className="h-3 w-3" />
            <span className="text-xs">
              {lastSync.toLocaleTimeString('th-TH', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Bulk operation progress component
export function BulkOperationProgress({ 
  title, 
  current, 
  total, 
  onCancel 
}: { 
  title: string; 
  current: number; 
  total: number; 
  onCancel: () => void;
}) {
  const progress = (current / total) * 100;

  return (
    <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-96 shadow-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <Progress value={progress} className="mb-3" />
        
        <div className="flex justify-between text-sm text-gray-600 mb-4">
          <span>{current} จาก {total} รายการ</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            ยกเลิก
          </Button>
          <Button variant="ghost" className="flex-1" disabled>
            กำลังดำเนินการ...
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Notification provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remove non-persistent notifications
    if (!notification.persistent && notification.autoClose !== false) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, notification.duration || 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider 
      value={{ notifications, addNotification, removeNotification, clearAll }}
    >
      <NotificationErrorBoundary>
        {children}
        <SystemStatus />
      </NotificationErrorBoundary>
    </NotificationContext.Provider>
  );
}