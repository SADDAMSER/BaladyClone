import { useState } from "react";
import { cn } from "@/lib/utils";
import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBreadcrumb?: boolean;
  fullWidth?: boolean;
  actions?: React.ReactNode;
}

export default function AdminLayout({
  children,
  title,
  showBreadcrumb = true,
  fullWidth = false,
  actions
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="flex h-screen">
        {/* Sidebar */}
        <AdminSidebar 
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <AdminHeader 
            title={title}
            showBreadcrumb={showBreadcrumb}
            actions={actions}
            onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          
          {/* Page Content */}
          <main 
            className={cn(
              "flex-1 overflow-y-auto bg-muted/30",
              fullWidth ? "p-0" : "p-6"
            )}
          >
            <div className={cn(
              fullWidth ? "w-full" : "container mx-auto max-w-7xl"
            )}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}