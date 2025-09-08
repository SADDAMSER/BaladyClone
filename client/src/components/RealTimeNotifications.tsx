import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Bell, X, Check, AlertCircle, Info, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Notification {
  id: string;
  userId: string;
  type: 'appointment' | 'assignment' | 'status_update' | 'reminder' | 'system';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  expiresAt?: string;
}

interface RealTimeNotificationsProps {
  userId: string;
  userRole?: string;
}

export default function RealTimeNotifications({ userId, userRole }: RealTimeNotificationsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mock data for demonstration - replace with real API call
  const mockNotifications: Notification[] = [
    {
      id: '1',
      userId: userId,
      type: 'appointment',
      title: 'موعد مساحة جديد',
      message: 'تم تحديد موعد جديد للمساحة يوم الأحد في الساعة 10:00 صباحاً',
      isRead: false,
      priority: 'high',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    },
    {
      id: '2',
      userId: userId,
      type: 'assignment',
      title: 'تكليف جديد',
      message: 'تم تكليفك بمهمة مساحة أرض في منطقة الصافية',
      isRead: false,
      priority: 'urgent',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    },
    {
      id: '3',
      userId: userId,
      type: 'status_update',
      title: 'تحديث حالة الطلب',
      message: 'تم الانتهاء من مراجعة الطلب رقم REQ-2024-001234 وهو جاهز للمعاينة',
      isRead: true,
      priority: 'medium',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
      id: '4',
      userId: userId,
      type: 'reminder',
      title: 'تذكير بموعد',
      message: 'لديك موعد مساحة غداً في الساعة 9:00 صباحاً',
      isRead: false,
      priority: 'medium',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    },
  ];

  // Mock query - replace with real API call
  const { data: notifications = mockNotifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', userId],
    queryFn: async () => {
      // Simulated API call
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockNotifications), 500);
      });
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update unread count when notifications change
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Show toast for new urgent notifications
  useEffect(() => {
    const urgentNotifications = notifications.filter(
      n => !n.isRead && n.priority === 'urgent' && 
      new Date(n.createdAt) > new Date(Date.now() - 60000) // Only show for notifications from last minute
    );

    urgentNotifications.forEach(notification => {
      toast({
        title: notification.title,
        description: notification.message,
        variant: "destructive",
        duration: 8000,
      });
    });
  }, [notifications, toast]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'assignment':
        return <User className="h-4 w-4 text-green-500" />;
      case 'status_update':
        return <Info className="h-4 w-4 text-orange-500" />;
      case 'reminder':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'system':
        return <Info className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `منذ ${diffInDays} يوم`;
  };

  const handleMarkAsRead = (notificationId: string) => {
    // Mock implementation - replace with real API call
    console.log('Marking notification as read:', notificationId);
    toast({
      title: "تم التحديث",
      description: "تم تعيين الإشعار كمقروء",
    });
  };

  const handleDelete = (notificationId: string) => {
    // Mock implementation - replace with real API call
    console.log('Deleting notification:', notificationId);
    toast({
      title: "تم الحذف",
      description: "تم حذف الإشعار",
    });
  };

  const handleMarkAllAsRead = () => {
    // Mock implementation - replace with real API call
    console.log('Marking all notifications as read');
    toast({
      title: "تم التحديث",
      description: "تم تعيين جميع الإشعارات كمقروءة",
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative p-2"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-0"
              data-testid="notification-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-96 p-0" 
        dir="rtl"
        data-testid="notifications-dropdown"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">الإشعارات</h3>
            <div className="flex items-center space-x-2 space-x-reverse">
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllAsRead}
                  className="text-xs h-6 px-2"
                  data-testid="button-mark-all-read"
                >
                  تعيين الكل كمقروء
                </Button>
              )}
              <Badge variant="secondary" className="text-xs">
                {notifications.length}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">جاري التحميل...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-3 border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
                data-testid={`notification-${notification.id}`}
              >
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {notification.title}
                      </p>
                      <Badge 
                        className={`text-xs ${getPriorityColor(notification.priority)}`}
                        data-testid={`priority-${notification.priority}`}
                      >
                        {notification.priority === 'urgent' ? 'عاجل' :
                         notification.priority === 'high' ? 'مهم' :
                         notification.priority === 'medium' ? 'متوسط' : 'عادي'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(notification.createdAt)}
                      </span>
                      
                      <div className="flex items-center space-x-1 space-x-reverse">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="h-6 w-6 p-0"
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          data-testid={`button-delete-${notification.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}