import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  FileText, 
  Users, 
  Settings, 
  Search, 
  BarChart3 
} from "lucide-react";

const quickActions = [
  {
    id: "new-application",
    label: "طلب جديد",
    icon: Plus,
    href: "/applications/new",
    color: "bg-blue-500 hover:bg-blue-600"
  },
  {
    id: "review-applications",
    label: "مراجعة الطلبات",
    icon: FileText,
    href: "/applications/pending",
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    id: "manage-users",
    label: "إدارة المستخدمين",
    icon: Users,
    href: "/user-management",
    color: "bg-purple-500 hover:bg-purple-600"
  },
  {
    id: "system-settings",
    label: "إعدادات النظام",
    icon: Settings,
    href: "/settings",
    color: "bg-gray-500 hover:bg-gray-600"
  },
  {
    id: "advanced-search",
    label: "البحث المتقدم",
    icon: Search,
    href: "/smart-search",
    color: "bg-orange-500 hover:bg-orange-600"
  },
  {
    id: "analytics",
    label: "التقارير",
    icon: BarChart3,
    href: "/advanced-analytics",
    color: "bg-indigo-500 hover:bg-indigo-600"
  }
];

export default function QuickActionsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">الإجراءات السريعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link key={action.id} href={action.href}>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all"
                data-testid={`quick-action-${action.id}`}
              >
                <div className={`p-2 rounded-lg text-white ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="text-xs text-center leading-tight">
                  {action.label}
                </span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}