import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  Download, 
  Printer,
  CheckCircle,
  Clock,
  Building2,
  Phone,
  Mail,
  Calendar,
  FileText,
  DollarSign
} from "lucide-react";

interface PaymentInvoiceData {
  id: string;
  applicationNumber: string;
  invoiceNumber: string;
  applicantName: string;
  applicantId: string;
  contactPhone: string;
  email?: string;
  serviceType: string;
  purpose: string;
  area?: string;
  governorate: string;
  district: string;
  fees: {
    basicFee: number;
    additionalFee: number;
    total: number;
  };
  issueDate: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  qrCode: string;
}

export default function PaymentInvoice() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Mock data - في التطبيق الحقيقي سيتم جلب البيانات من API
  const invoiceData: PaymentInvoiceData = {
    id: params.id || 'mock-invoice-1',
    applicationNumber: 'APP-2025-297204542',
    invoiceNumber: 'INV-711220912',
    applicantName: 'صدام حسين حسين السراجي',
    applicantId: '778774772',
    contactPhone: '777123456',
    email: 'user@example.com',
    serviceType: 'إصدار تقرير مساحي',
    purpose: 'عن نفسي',
    area: '700',
    governorate: 'صنعاء',
    district: 'شعوب',
    fees: {
      basicFee: 55000,
      additionalFee: 2000,
      total: 57000
    },
    issueDate: '2025-03-31',
    dueDate: '2025-04-15',
    status: 'pending',
    qrCode: 'QR_CODE_DATA_HERE'
  };

  // Transfer to treasury mutation
  const transferToTreasuryMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('employee_token');
      localStorage.setItem("auth-token", token || '');
      
      try {
        const response = await apiRequest('POST', `/api/applications/${invoiceData.id}/generate-invoice`, {});
        return await response.json();
      } finally {
        localStorage.removeItem("auth-token");
      }
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم ترحيل الطلب إلى الصندوق للسداد",
      });
      
      // Close this window and redirect opener to treasury
      if (window.opener) {
        window.opener.location.href = '/employee/treasury';
        window.close();
      } else {
        setLocation('/employee/treasury');
      }
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في ترحيل الطلب إلى الصندوق",
        variant: "destructive",
      });
    },
  });

  const handlePrint = () => {
    // Print the invoice
    window.print();
    
    // After printing, transfer to treasury
    setTimeout(() => {
      setIsTransferring(true);
      transferToTreasuryMutation.mutate();
    }, 1000);
  };

  const handleDownloadPDF = () => {
    toast({
      title: "تحميل PDF",
      description: "سيتم تحميل الفاتورة كملف PDF قريباً",
    });
  };

  const handleGoBack = () => {
    setLocation('/employee/treasury');
  };

  // Auto-print if requested
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoprint') === 'true') {
      // Auto-print after component loads
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-YE', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header - Only shown on screen, hidden in print */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="ml-4"
                data-testid="button-back"
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                العودة للصندوق
              </Button>
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-blue-600 ml-2" />
                <span className="text-lg font-semibold">فاتورة سداد - {invoiceData.invoiceNumber}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadPDF}
                data-testid="button-download-pdf"
              >
                <Download className="h-4 w-4 ml-2" />
                تحميل PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                disabled={isTransferring || transferToTreasuryMutation.isPending}
                data-testid="button-print"
              >
                <Printer className="h-4 w-4 ml-2" />
                {isTransferring ? 'جاري الترحيل...' : 'طباعة وترحيل للصندوق'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0" ref={printRef}>
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg print:shadow-none print:rounded-none">
          {/* Invoice Header */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              {/* Left side - Application details */}
              <div className="space-y-2 text-sm">
                <div><strong>رقم الطلب:</strong> {invoiceData.applicationNumber}</div>
                <div><strong>تاريخ الطلب:</strong> {formatDate(invoiceData.issueDate)}</div>
                <div><strong>رقم الفاتورة:</strong> {invoiceData.invoiceNumber}</div>
                <div><strong>حالة الفاتورة:</strong> 
                  <Badge className="mr-2" variant={invoiceData.status === 'paid' ? 'default' : 'secondary'}>
                    {invoiceData.status === 'paid' ? 'تم الدفع' : 'غير مدفوع'}
                  </Badge>
                </div>
              </div>

              {/* Center - QR Code */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-600 border-2 border-gray-400 flex items-center justify-center">
                  <div className="grid grid-cols-8 gap-px w-20 h-20">
                    {Array.from({ length: 64 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-full h-full ${
                          Math.random() > 0.5 ? 'bg-black' : 'bg-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">QR Code</p>
              </div>

              {/* Right side - Ministry logo and header */}
              <div className="text-center">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
                  شعار
                </div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">الجمهورية اليمنية</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">وزارة النقل والأشغال العامة</p>
                <h2 className="text-xl font-bold text-teal-600 mt-4">إشعار سداد</h2>
              </div>
            </div>
          </div>

          {/* Customer Details Section */}
          <div className="p-6">
            <div className="bg-teal-600 text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold">تفاصيل المستفيد والخدمة</h3>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">اسم الخدمة:</span>
                  <span className="mr-2">{invoiceData.serviceType}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">رقم الهوية:</span>
                  <span className="mr-2">{invoiceData.applicantId}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">اسم المستفيد:</span>
                  <span className="mr-2">{invoiceData.applicantName}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">نوع الوثيقة:</span>
                  <span className="mr-2">مساحة بحسب الوثيقة</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">حالة الوثيقة:</span>
                  <span className="mr-2">--</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">مساحة بحسب الوثيقة:</span>
                  <span className="mr-2">{invoiceData.area} متر مربع</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Details Section */}
          <div className="p-6">
            <div className="bg-teal-600 text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold">تفاصيل الفاتورة</h3>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">رقم الحساب:</span>
                  <span className="mr-2">30000001</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">اسم الحساب:</span>
                  <span className="mr-2">حساب الإيرادات</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">تاريخ الفاتورة:</span>
                  <span className="mr-2">{formatDate(invoiceData.issueDate)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">المرجع:</span>
                  <span className="mr-2">508925</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">العملة:</span>
                  <span className="mr-2">ريال يمني</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">إجمالي المبلغ المستحق:</span>
                  <span className="mr-2 text-lg font-bold text-teal-600">{formatCurrency(invoiceData.fees.total)} ريال</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fees Breakdown Table */}
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">الإجمالي</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">السعر الجزئي</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">الكمية/العدد</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">اسم الوحدة</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">تفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-semibold">
                      {formatCurrency(invoiceData.fees.basicFee)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      {formatCurrency(500)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">700</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">م مربع</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      مقابل رسوم الخدمة لمساحة 700 متر مربع
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-semibold">
                      {formatCurrency(invoiceData.fees.additionalFee)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      {formatCurrency(2000)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">1</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">--</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      رسوم كشفية
                    </td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-lg text-teal-600">
                      {formatCurrency(invoiceData.fees.total)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" colSpan={4}>
                      إجمالي المبلغ المستحق
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>اسم المحصل: مدير النظام</p>
            <p>توقيع المحصل</p>
            <div className="mt-4 text-xs">
              <p>هذه الفاتورة صادرة إلكترونياً ولا تحتاج لختم أو توقيع</p>
              <p>للاستفسار: 777123456 | البريد الإلكتروني: info@transport.gov.ye</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}