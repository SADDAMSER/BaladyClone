import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Building, Menu } from "lucide-react";
import { navigationConfig, type NavigationItem } from "@/utils/navigation";

interface AdminSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export default function AdminSidebar({ collapsed, onCollapsedChange }: AdminSidebarProps) {
  const [location] = useLocation();
  const [openItems, setOpenItems] = useState<string[]>(['services']);

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location === path || location.startsWith(path + '/');
  };

  const isParentActive = (item: NavigationItem): boolean => {
    if (item.path && isActive(item.path)) return true;
    return item.children?.some(child => isActive(child.path)) ?? false;
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = isActive(item.path);
    const isParentItemActive = isParentActive(item);
    const isOpen = openItems.includes(item.id);

    if (hasChildren) {
      return (
        <Collapsible
          key={item.id}
          open={isOpen}
          onOpenChange={() => toggleItem(item.id)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 px-3",
                level > 0 && "mr-4",
                isParentItemActive && "bg-primary/10 text-primary",
                collapsed && "justify-center px-2"
              )}
              data-testid={`nav-item-${item.id}`}
            >
              <item.icon className={cn("h-4 w-4 flex-shrink-0")} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-right">{item.label}</span>
                  <div className="flex items-center gap-1">
                    {item.badge && (
                      <Badge 
                        variant="secondary" 
                        className="h-5 text-xs"
                      >
                        {item.badge.text}
                      </Badge>
                    )}
                    {isOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </div>
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          {!collapsed && (
            <CollapsibleContent className="space-y-1">
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </CollapsibleContent>
          )}
        </Collapsible>
      );
    }

    const content = (
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 h-10 px-3",
          level > 0 && "mr-4 text-sm",
          isItemActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          collapsed && "justify-center px-2"
        )}
        data-testid={`nav-item-${item.id}`}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-right">{item.label}</span>
            {item.badge && (
              <Badge 
                variant={isItemActive ? "secondary" : "outline"} 
                className="h-5 text-xs"
              >
                {item.badge.text}
              </Badge>
            )}
          </>
        )}
      </Button>
    );

    if (item.path) {
      return (
        <Link key={item.id} href={item.path}>
          {content}
        </Link>
      );
    }

    return <div key={item.id}>{content}</div>;
  };

  return (
    <div className={cn(
      "bg-background border-l border-border flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo/Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Building className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-bold text-sm">منصة بناء اليمن</h2>
              <p className="text-xs text-muted-foreground">لوحة التحكم الإدارية</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-2">
        <nav className="space-y-1">
          {navigationConfig.map(item => renderNavigationItem(item))}
        </nav>
      </ScrollArea>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => onCollapsedChange(!collapsed)}
          data-testid="sidebar-toggle"
        >
          <Menu className="h-4 w-4" />
          {!collapsed && <span className="mr-2">طي الشريط</span>}
        </Button>
      </div>
    </div>
  );
}