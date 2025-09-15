import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { User, Shield } from "lucide-react";

interface LoginProps {
  onLogin: (user: any, token: string) => void;
}

export default function SimpleLogin({ onLogin }: LoginProps) {
  const [selectedUser, setSelectedUser] = useState("");

  // Pre-configured test users
  const testUsers = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      username: 'admin_test',
      fullName: 'مدير النظام',
      role: 'admin',
      description: 'مدير النظام - صلاحيات كاملة'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'citizen_test',
      fullName: 'احمد المواطن',
      role: 'citizen',
      description: 'مواطن - يمكنه تقديم الطلبات'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      username: 'cashier_01',
      fullName: 'سعد أمين الصندوق',
      role: 'employee',
      description: 'أمين الصندوق - استلام الرسوم'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440020',
      username: 'public_service_01',
      fullName: 'محمد موظف الخدمة العامة',
      role: 'employee',
      description: 'الخدمة العامة - مراجعة المستندات'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440030',
      username: 'dept_manager_01',
      fullName: 'محمد مدير قسم المساحة',
      role: 'manager',
      description: 'مدير القسم - توزيع المهام'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440040',
      username: 'surveyor_01',
      fullName: 'فهد المهندس المساح الأول',
      role: 'employee',
      description: 'مهندس مساح - إجراء المسح الميداني'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440050',
      username: 'surveyor_02',
      fullName: 'سالم المهندس المساح الثاني',
      role: 'employee',
      description: 'مهندس مساح - إجراء المسح الميداني'
    }
  ];

  const loginMutation = useMutation({
    mutationFn: async (username: string) => {
      const user = testUsers.find(u => u.username === username);
      if (!user) {
        throw new Error('User not found');
      }

      // Use real login endpoint for proper JWT tokens  
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          mockUser: true // Signal that this is a test user
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      return { user: data.user, token: data.token };
    },
    onSuccess: (data) => {
      // Store token in localStorage (use 'token' key to match API calls)
      localStorage.setItem('token', data.token);
      localStorage.setItem('auth_token', data.token); // Keep for compatibility
      localStorage.setItem('current_user', JSON.stringify(data.user));
      
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `مرحباً ${data.user.fullName}`,
        variant: "default",
      });

      onLogin(data.user, data.token);
    },
    onError: () => {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  });

  const handleLogin = async () => {
    if (!selectedUser) {
      toast({
        title: "يرجى اختيار المستخدم",
        description: "اختر المستخدم الذي تريد تسجيل الدخول به",
        variant: "destructive",
      });
      return;
    }

    await loginMutation.mutateAsync(selectedUser);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'citizen':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'manager':
        return <Shield className="h-4 w-4 text-purple-600" />;
      default:
        return <User className="h-4 w-4 text-green-600" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">منصة بناء اليمن</CardTitle>
          <p className="text-muted-foreground">نظام اختبار - اختر المستخدم</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>اختيار المستخدم للاختبار</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger data-testid="select-test-user" className="mt-2">
                <SelectValue placeholder="اختر نوع المستخدم..." />
              </SelectTrigger>
              <SelectContent>
                {testUsers.map((user) => (
                  <SelectItem key={user.id} value={user.username}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-muted-foreground">{user.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loginMutation.isPending || !selectedUser}
            className="w-full"
            data-testid="button-login"
          >
            {loginMutation.isPending ? 'جاري تسجيل الدخول...' : 'دخول للنظام'}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>نظام اختبار - يمكنك التبديل بين أنواع المستخدمين المختلفة</p>
            <p>لاختبار جميع مراحل سير العمل</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}