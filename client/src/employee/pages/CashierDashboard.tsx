import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Receipt, 
  CreditCard, 
  DollarSign, 
  Clock, 
  Search,
  CheckCircle,
  Eye,
  FileText
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface Application {
  id: string;
  applicationNumber: string;
  applicantId: string;
  serviceId: string;
  status: string;
  currentStage: string;
  applicationData: any;
  fees: string;
  isPaid: boolean;
  paymentDate: string | null;
  createdAt: string;
}

export default function CashierDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const queryClient = useQueryClient();

  // Get unpaid applications
  const { data: unpaidApplications = [], isLoading } = useQuery({
    queryKey: ['/api/applications', { isPaid: false, status: 'submitted' }],
  });

  // Get paid applications today - using query with all paid applications for now
  const { data: allApplications = [] } = useQuery({
    queryKey: ['/api/applications'],
  });

  // Filter paid applications from today
  const paidToday = allApplications.filter((app: Application) => {
    if (!app.isPaid || !app.paymentDate) return false;
    const today = new Date().toISOString().split('T')[0];
    const paymentDay = new Date(app.paymentDate).toISOString().split('T')[0];
    return paymentDay === today;
  });

  // Process payment mutation - Updated to use standard payment API
  const processPaymentMutation = useMutation({
    mutationFn: async ({ 
      applicationId, 
      paymentMethod, 
      notes
    }: { 
      applicationId: string;
      paymentMethod: string; 
      notes: string;
    }) => {
      // Use standard payment confirmation API
      return apiRequest('/api/payments/confirm', 'POST', {
        applicationId,
        paymentMethod,
        notes
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications/paid-today'] });
      toast({
        title: "تم تأكيد الدفع بنجاح",
        description: `تم استلام الرسوم للطلب رقم ${selectedApplication?.applicationNumber}`,
        variant: "default",
      });
      setSelectedApplication(null);
      setPaymentNotes("");
    },
    onError: (error) => {
      toast({
        title: "خطأ في معالجة الدفعة",
        description: "حدث خطأ أثناء تسجيل الدفعة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  });

  const filteredApplications = unpaidApplications.filter((app: Application) =>
    app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.applicationData?.applicantName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnpaid = unpaidApplications.length;
  const totalPaidToday = paidToday.length;
  const totalFeesToday = paidToday.reduce((sum, app) => sum + parseFloat(app.fees || '0'), 0);

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('ar-YE', {
      style: 'currency',
      currency: 'YER',
    }).format(Number(amount));
  };

  const handlePayment = async () => {
    if (!selectedApplication) return;

    await processPaymentMutation.mutateAsync({
      applicationId: selectedApplication.id,
      paymentMethod,
      notes: paymentNotes
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">لوحة أمين الصندوق</h1>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('ar-YE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات غير مدفوعة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalUnpaid}</div>
            <p className="text-xs text-muted-foreground">في انتظار الدفع</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مدفوعة اليوم</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPaidToday}</div>
            <p className="text-xs text-muted-foreground">طلب مدفوع</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات اليوم</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalFeesToday)}
            </div>
            <p className="text-xs text-muted-foreground">ريال يمني</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الإنجاز</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalUnpaid + totalPaidToday > 0 
                ? Math.round((totalPaidToday / (totalUnpaid + totalPaidToday)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">طلبات معالجة</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="unpaid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unpaid" data-testid="tab-unpaid">
            طلبات غير مدفوعة ({totalUnpaid})
          </TabsTrigger>
          <TabsTrigger value="paid" data-testid="tab-paid">
            مدفوعة اليوم ({totalPaidToday})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unpaid" className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم الطلب أو اسم مقدم الطلب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8"
                data-testid="input-search-applications"
              />
            </div>
          </div>

          {/* Unpaid Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>الطلبات المطلوب دفع رسومها</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-6">جاري التحميل...</div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  لا توجد طلبات غير مدفوعة
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>مقدم الطلب</TableHead>
                      <TableHead>نوع الخدمة</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>تاريخ التقديم</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application: Application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.applicationNumber}
                        </TableCell>
                        <TableCell>
                          {application.applicationData?.applicantName || 'غير محدد'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">قرار مساحي</Badge>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(application.fees)}
                        </TableCell>
                        <TableCell>
                          {new Date(application.createdAt).toLocaleDateString('ar-YE')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedApplication(application)}
                                  data-testid={`button-view-${application.id}`}
                                >
                                  <Eye className="h-4 w-4 ml-1" />
                                  عرض
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>تفاصيل الطلب</DialogTitle>
                                </DialogHeader>
                                {selectedApplication && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>رقم الطلب</Label>
                                        <p className="text-sm font-medium">{selectedApplication.applicationNumber}</p>
                                      </div>
                                      <div>
                                        <Label>مقدم الطلب</Label>
                                        <p className="text-sm">{selectedApplication.applicationData?.applicantName}</p>
                                      </div>
                                      <div>
                                        <Label>رقم الهاتف</Label>
                                        <p className="text-sm">{selectedApplication.applicationData?.contactPhone}</p>
                                      </div>
                                      <div>
                                        <Label>المبلغ المطلوب</Label>
                                        <p className="text-sm font-bold text-green-600">
                                          {formatCurrency(selectedApplication.fees)}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label>طريقة الدفع</Label>
                                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger data-testid="select-payment-method">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="cash">نقداً</SelectItem>
                                          <SelectItem value="bank_transfer">حوالة بنكية</SelectItem>
                                          <SelectItem value="check">شيك</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>ملاحظات الدفع</Label>
                                      <Textarea
                                        placeholder="أي ملاحظات إضافية..."
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        data-testid="textarea-payment-notes"
                                      />
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                      <Button
                                        onClick={handlePayment}
                                        disabled={processPaymentMutation.isPending}
                                        className="flex-1"
                                        data-testid="button-confirm-payment"
                                      >
                                        <CreditCard className="h-4 w-4 ml-2" />
                                        {processPaymentMutation.isPending ? 'جاري المعالجة...' : 'تأكيد الدفع'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الطلبات المدفوعة اليوم</CardTitle>
            </CardHeader>
            <CardContent>
              {paidToday.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  لم يتم دفع أي طلبات اليوم بعد
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>مقدم الطلب</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>وقت الدفع</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidToday.map((application: Application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.applicationNumber}
                        </TableCell>
                        <TableCell>
                          {application.applicationData?.applicantName || 'غير محدد'}
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(application.fees)}
                        </TableCell>
                        <TableCell>
                          {application.paymentDate 
                            ? new Date(application.paymentDate).toLocaleString('ar-YE')
                            : 'غير محدد'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 ml-1" />
                            مدفوع
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}