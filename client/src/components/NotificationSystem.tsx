import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock,
  User,
  FileText,
  Settings,
  MessageSquare
} from 'lucide-react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  read: boolean;
  category: 'system' | 'application' | 'user' | 'task';
  actionUrl?: string;
  userId?: string;
}

interface NotificationSystemProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
}

export default function NotificationSystem({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification
}: NotificationSystemProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getCategoryIcon = (category: Notification['category']) => {
    switch (category) {
      case 'system':
        return <Settings className="w-4 h-4" />;
      case 'application':
        return <FileText className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
      case 'task':
        return <Clock className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    // Sort by priority first, then by timestamp
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end" dir="rtl">
      <Card className="w-96 h-full max-h-screen m-0 rounded-none border-l shadow-xl">
        <CardHeader className="border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              الإشعارات
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              data-testid="close-notifications"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onMarkAllAsRead}
              className="self-start"
              data-testid="mark-all-read"
            >
              تحديد الكل كمقروء
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-120px)]">
            {sortedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <Bell className="w-12 h-12 mb-4 text-gray-300" />
                <p className="text-center">لا توجد إشعارات</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sortedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getNotificationIcon(notification.type)}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(notification.priority)}`}
                        >
                          {notification.priority === 'urgent' ? 'عاجل' :
                           notification.priority === 'high' ? 'مهم' :
                           notification.priority === 'medium' ? 'متوسط' : 'عادي'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(notification.category)}
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm mb-1">
                      {notification.title}
                    </h4>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMarkAsRead(notification.id)}
                          data-testid={`mark-read-${notification.id}`}
                        >
                          <CheckCircle className="w-3 h-3 ml-1" />
                          تحديد كمقروء
                        </Button>
                      )}
                      
                      {notification.actionUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = notification.actionUrl!}
                        >
                          عرض التفاصيل
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteNotification(notification.id)}
                        data-testid={`delete-${notification.id}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'طلب ترخيص جديد',
      message: 'تم استلام طلب ترخيص بناء سكني جديد يتطلب المراجعة',
      type: 'info',
      priority: 'medium',
      timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      read: false,
      category: 'application',
      actionUrl: '/building-licenses/123'
    },
    {
      id: '2',
      title: 'تحديث النظام',
      message: 'تم تحديث النظام بنجاح إلى الإصدار 2.1.0',
      type: 'success',
      priority: 'low',
      timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
      read: false,
      category: 'system'
    },
    {
      id: '3',
      title: 'مهمة متأخرة',
      message: 'يوجد مهمة متأخرة تحتاج إلى إنجاز عاجل',
      type: 'warning',
      priority: 'high',
      timestamp: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
      read: true,
      category: 'task',
      actionUrl: '/task-management'
    }
  ]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
}