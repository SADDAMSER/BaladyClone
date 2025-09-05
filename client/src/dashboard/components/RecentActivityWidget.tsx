import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  User, 
  Settings, 
  CheckCircle, 
  Clock,
  AlertTriangle
} from "lucide-react";

interface Activity {
  id: string;
  type: 'application' | 'user' | 'system' | 'approval';
  title: string;
  description: string;
  time: string;
  status: 'success' | 'pending' | 'warning' | 'error';
  user?: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "application",
    title: "طلب رخصة بناء جديد",
    description: "تم استلام طلب رخصة بناء من أحمد محمد الزهراني",
    time: "منذ 5 دقائق",
    status: "pending",
    user: "أحمد الزهراني"
  },
  {
    id: "2", 
    type: "approval",
    title: "اعتماد قرار مساحي",
    description: "تم اعتماد القرار المساحي رقم QM-2024-001",
    time: "منذ 15 دقيقة",
    status: "success",
    user: "مدير المساحة"
  },
  {
    id: "3",
    type: "user",
    title: "مستخدم جديد",
    description: "تم تسجيل مستخدم جديد في النظام",
    time: "منذ 30 دقيقة", 
    status: "success",
    user: "فاطمة الحداد"
  },
  {
    id: "4",
    type: "system",
    title: "تحديث النظام",
    description: "تم تحديث قاعدة بيانات الاشتراطات الفنية",
    time: "منذ ساعة",
    status: "success",
    user: "النظام"
  },
  {
    id: "5",
    type: "application",
    title: "طلب يحتاج مراجعة",
    description: "طلب رخصة بناء BL-2024-089 يحتاج مراجعة إضافية",
    time: "منذ ساعتين",
    status: "warning",
    user: "محمد البكري"
  },
  {
    id: "6",
    type: "system",
    title: "نسخ احتياطي",
    description: "تم إنشاء نسخة احتياطية من قاعدة البيانات",
    time: "منذ 3 ساعات",
    status: "success",
    user: "النظام"
  }
];

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'application':
      return FileText;
    case 'user':
      return User;
    case 'system':
      return Settings;
    case 'approval':
      return CheckCircle;
    default:
      return FileText;
  }
};

const getStatusIcon = (status: Activity['status']) => {
  switch (status) {
    case 'success':
      return CheckCircle;
    case 'pending':
      return Clock;
    case 'warning':
      return AlertTriangle;
    case 'error':
      return AlertTriangle;
    default:
      return Clock;
  }
};

const getStatusColor = (status: Activity['status']) => {
  switch (status) {
    case 'success':
      return 'text-green-600';
    case 'pending':
      return 'text-blue-600';
    case 'warning':
      return 'text-yellow-600';
    case 'error':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const getStatusBadge = (status: Activity['status']) => {
  switch (status) {
    case 'success':
      return { variant: 'default' as const, label: 'مكتمل' };
    case 'pending':
      return { variant: 'secondary' as const, label: 'معلق' };
    case 'warning':
      return { variant: 'outline' as const, label: 'يحتاج مراجعة' };
    case 'error':
      return { variant: 'destructive' as const, label: 'خطأ' };
    default:
      return { variant: 'secondary' as const, label: 'غير محدد' };
  }
};

export default function RecentActivityWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">النشاط الحديث</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <div className="space-y-1 p-6 pt-0">
            {activities.map((activity) => {
              const ActivityIcon = getActivityIcon(activity.type);
              const StatusIcon = getStatusIcon(activity.status);
              const statusColor = getStatusColor(activity.status);
              const statusBadge = getStatusBadge(activity.status);

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`activity-${activity.id}`}
                >
                  {/* Activity Icon */}
                  <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                    <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium truncate">{activity.title}</h4>
                      <StatusIcon className={`h-3 w-3 flex-shrink-0 ${statusColor}`} />
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                      <Badge variant={statusBadge.variant} className="text-xs">
                        {statusBadge.label}
                      </Badge>
                    </div>
                    
                    {activity.user && (
                      <div className="text-xs text-muted-foreground mt-1">
                        بواسطة: {activity.user}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}