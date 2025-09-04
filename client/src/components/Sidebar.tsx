import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Building, 
  Map, 
  Cog, 
  Scale, 
  Table, 
  ListTodo,
  FileText,
  Users,
  Settings,
  BarChart3,
  LucideIcon
} from "lucide-react";

interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  color?: string;
}

export default function Sidebar() {
  const [location] = useLocation();

  const sidebarItems: SidebarItem[] = [
    { href: "/", label: "لوحة التحكم", icon: Home },
    { href: "/building-licenses", label: "تراخيص البناء", icon: Building, badge: "45" },
    { href: "/surveying-decision", label: "القرار المساحي", icon: Map, badge: "23" },
    { href: "/technical-requirements", label: "الاشتراطات الفنية", icon: Cog, badge: "167" },
    { href: "/legal-system", label: "النظام القانوني", icon: Scale, badge: "144" },
    { href: "/organizational-structure", label: "الهيكل التنظيمي", icon: Table, badge: "85" },
    { href: "/task-management", label: "إدارة المهام", icon: ListTodo, badge: "127" },
    { href: "/reports", label: "التقارير", icon: BarChart3 },
    { href: "/users", label: "المستخدمين", icon: Users },
    { href: "/settings", label: "الإعدادات", icon: Settings }
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0" data-testid="sidebar">
      <div className="p-4">
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-cairo">القائمة الرئيسية</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "secondary" : "ghost"}
                    className={`w-full justify-start text-right h-10 ${
                      location === item.href 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                    data-testid={`sidebar-item-${item.href.slice(1) || 'home'}`}
                  >
                    <item.icon size={16} className="ml-2" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge 
                        variant="secondary" 
                        className="mr-2 text-xs"
                        data-testid={`sidebar-badge-${item.href.slice(1) || 'home'}`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
