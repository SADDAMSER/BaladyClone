import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, User, Lock, AlertCircle } from "lucide-react";

interface EmployeeLoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function EmployeeLogin({ onLoginSuccess }: EmployeeLoginProps) {
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      const data = await response.json();

      if (data.token) {
        // Save token to localStorage
        localStorage.setItem('employee_token', data.token);
        localStorage.setItem('employee_user', JSON.stringify(data.user));
        
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: `مرحباً ${data.user.fullName || data.user.username}`,
        });

        onLoginSuccess(data.token, data.user);
      }
    } catch (error: any) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      toast({
        title: "خطأ في تسجيل الدخول",
        description: "تأكد من صحة اسم المستخدم وكلمة المرور",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo credentials helper
  const useDemoCredentials = () => {
    setCredentials({
      username: "public_service",
      password: "demo123"
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" dir="rtl">
      <div className="max-w-md w-full px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
            <CardDescription>
              خدمة الجمهور - موظفي مراجعة الطلبات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="ادخل اسم المستخدم"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    className="pr-10"
                    required
                    data-testid="input-username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="ادخل كلمة المرور"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="pr-10"
                    required
                    data-testid="input-password"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>

              {/* Demo helper */}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 text-center mb-2">للتجربة:</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={useDemoCredentials}
                  className="w-full"
                >
                  استخدام بيانات تجريبية
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}