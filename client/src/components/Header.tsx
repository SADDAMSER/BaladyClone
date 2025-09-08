import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Bell, User, Menu, Home, FileText, BarChart3, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import RealTimeNotifications from "@/components/RealTimeNotifications";

export default function Header() {
  const [location] = useLocation();
  // Mock user ID for notifications - replace with actual user data
  const mockUserId = "user-123";

  const navigationItems = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/my-services", label: "خدماتي", icon: FileText },
    { href: "/reports", label: "التقارير", icon: BarChart3 },
    { href: "/settings", label: "الإعدادات", icon: Settings }
  ];

  return (
    <header className="bg-gradient-to-r from-primary to-secondary shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <Link href="/">
            <div className="flex items-center space-x-4 space-x-reverse cursor-pointer">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <Building className="text-accent-foreground text-xl" size={24} />
              </div>
              <div className="text-primary-foreground">
                <h1 className="text-xl font-bold font-cairo" data-testid="platform-title">منصة بناء اليمن</h1>
                <p className="text-sm opacity-90" data-testid="platform-subtitle">الخدمات البلدية والعمرانية الرقمية</p>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 space-x-reverse">
            <nav className="flex space-x-4 space-x-reverse">
              {navigationItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`text-primary-foreground hover:text-accent hover:bg-white/10 transition-colors px-3 py-2 ${
                      location === item.href ? 'bg-white/20' : ''
                    }`}
                    data-testid={`nav-${item.label}`}
                  >
                    <item.icon className="h-4 w-4 ml-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
            
            <div className="flex items-center space-x-3 space-x-reverse">
              <RealTimeNotifications userId={mockUserId} userRole="citizen" />
              
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 bg-accent rounded-full flex items-center justify-center"
                data-testid="button-user-profile"
              >
                <User className="text-accent-foreground text-sm" size={16} />
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-primary-foreground"
                  data-testid="button-mobile-menu"
                >
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  {navigationItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-right"
                        data-testid={`mobile-nav-${item.label}`}
                      >
                        <item.icon className="h-4 w-4 ml-2" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                  
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-center">
                      <RealTimeNotifications userId={mockUserId} userRole="citizen" />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}