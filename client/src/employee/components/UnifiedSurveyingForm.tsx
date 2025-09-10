import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Application {
  id: string;
  applicationNumber: string;
  applicationData: {
    applicantName: string;
    applicantId: string;
    phoneNumber: string;
    location: string;
    area: string;
    purpose: string;
  };
  fees: number | string;
  submittedAt: string;
  invoiceNumber?: string;
}

interface UnifiedSurveyingFormProps {
  application: Application;
  barcode?: string;
}

export default function UnifiedSurveyingForm({ application, barcode }: UnifiedSurveyingFormProps) {
  const currentDate = new Date().toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const generateBarcode = () => {
    return barcode || `*${application.applicationNumber}*`;
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 print:p-6 print:shadow-none" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* الرأسية الرسمية */}
      <div className="flex items-center justify-between mb-8 border-b-2 border-green-600 pb-4">
        <div className="text-right">
          <div className="text-sm text-gray-600">تاريخ الطلب: {currentDate}</div>
          <div className="text-sm text-gray-600">المحافظة: العاصمة صنعاء</div>
          <div className="text-sm text-gray-600">المديرية: مديرية شوسان ومنج باعول</div>
          <div className="text-sm text-gray-600">رقم القاطوة: 711290912</div>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-400 border-2 border-black flex items-center justify-center text-xs font-bold">
            QR
          </div>
          <div className="text-xs mt-1">طلب إصدار قرار مساحي</div>
        </div>

        <div className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-12 h-8 bg-red-600"></div>
            <div className="w-12 h-8 bg-white border border-black"></div>
            <div className="w-12 h-8 bg-black"></div>
          </div>
          <div className="text-sm font-bold">وزارة الثقل والنقل العامة</div>
        </div>
      </div>

      {/* بيانات مقدم الطلب */}
      <div className="mb-6">
        <div className="bg-green-600 text-white p-2 text-center font-bold mb-4">
          بيانات مقدم الطلب
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between border-b pb-1">
            <span>اسم المستفيد:</span>
            <span className="font-bold">{application.applicationData.applicantName}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span>رقم الهوية:</span>
            <span className="font-bold">{application.applicationData.applicantId}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span>رقم الجوال:</span>
            <span className="font-bold">{application.applicationData.phoneNumber}</span>
          </div>
        </div>

        <div className="mt-4 text-sm">
          <div className="flex justify-between border-b pb-1">
            <span>صفة المستفيد في قطعة الأرض:</span>
            <span className="font-bold">مالك</span>
          </div>
        </div>
      </div>

      {/* وثائق الطلب */}
      <div className="mb-6">
        <div className="bg-green-600 text-white p-2 text-center font-bold mb-4">
          وثائق الطلب
        </div>

        <table className="w-full border-collapse border border-green-600 text-sm">
          <thead>
            <tr className="bg-green-100">
              <th className="border border-green-600 p-2 text-center">#</th>
              <th className="border border-green-600 p-2">معرف الوثيقة</th>
              <th className="border border-green-600 p-2">اسم الموضوع</th>
              <th className="border border-green-600 p-2">نوع الوثيقة</th>
              <th className="border border-green-600 p-2">حالة الوثيقة</th>
              <th className="border border-green-600 p-2">المساحة م²</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-green-600 p-2 text-center">1</td>
              <td className="border border-green-600 p-2">297949283</td>
              <td className="border border-green-600 p-2">موضوع توزيعي</td>
              <td className="border border-green-600 p-2">صك (مصدق)</td>
              <td className="border border-green-600 p-2">جر مصدق</td>
              <td className="border border-green-600 p-2">500</td>
            </tr>
            <tr>
              <td className="border border-green-600 p-2 text-center">2</td>
              <td className="border border-green-600 p-2">429901437</td>
              <td className="border border-green-600 p-2">موضوع توزيعي</td>
              <td className="border border-green-600 p-2">صك (مصدق)</td>
              <td className="border border-green-600 p-2">جر مصدق</td>
              <td className="border border-green-600 p-2">200</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* بيانات الموقع الجغرافي */}
      <div className="mb-6">
        <div className="bg-green-600 text-white p-2 text-center font-bold mb-4">
          بيانات الموقع الجغرافي
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <div className="font-bold">المحافظة: صنعاء</div>
            <div>رقم الدفتر: 2A</div>
            <div>الإحداثيات: 15.25669541447073</div>
          </div>
          <div>
            <div className="font-bold">المديرية: شوسان ومنج باعول</div>
            <div>رقم المخطط: 2A</div>
            <div>الطريقية: 44.261168574313488</div>
          </div>
          <div>
            <div className="font-bold">العزلة: خمس واد الياح</div>
          </div>
          <div>
            <div className="font-bold">الخوي: جي والدي جناب</div>
          </div>
        </div>

        <table className="w-full border-collapse border border-green-600 text-sm">
          <thead>
            <tr className="bg-green-100">
              <th className="border border-green-600 p-2">#</th>
              <th className="border border-green-600 p-2">اسم المالك</th>
              <th className="border border-green-600 p-2">هوية المالك</th>
              <th className="border border-green-600 p-2">نوع المالك</th>
              <th className="border border-green-600 p-2">رقم الجوال</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-green-600 p-2">1</td>
              <td className="border border-green-600 p-2">صدام حسين حسين البدراني</td>
              <td className="border border-green-600 p-2">1000254884</td>
              <td className="border border-green-600 p-2">مالك</td>
              <td className="border border-green-600 p-2">778774772</td>
            </tr>
            <tr>
              <td className="border border-green-600 p-2">2</td>
              <td className="border border-green-600 p-2">محمد حسين محسن رسام</td>
              <td className="border border-green-600 p-2">707125844</td>
              <td className="border border-green-600 p-2">إضافي</td>
              <td className="border border-green-600 p-2">707125844</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ملاحظات وتوجيهات */}
      <div className="mb-8">
        <div className="bg-red-100 border-r-4 border-red-500 p-4">
          <div className="font-bold text-red-800 mb-2">تعليمات وتوجيهات المستفيدين:</div>
          <div className="text-sm text-red-700">
            • أقر وأتعهد بأن المعلومات المذكورة أعلاه صحيحة
          </div>
        </div>
      </div>

      {/* التوقيعات */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="text-center">
          <div className="border-t border-black mt-16 pt-2">
            <div className="font-bold">توقيع المستفيد</div>
            <div className="text-sm">محمد أحمد البدراني</div>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black mt-16 pt-2">
            <div className="font-bold">توقيع المختص</div>
          </div>
        </div>
      </div>

      {/* خط الفصل */}
      <div className="border-t-2 border-dashed border-gray-400 my-8 relative">
        <div className="absolute -top-3 left-4 bg-white px-2 text-gray-500 text-sm">
          ✂️ اقطع هنا - الجزء السفلي للمستفيد كإيصال سداد
        </div>
      </div>

      {/* الجزء القابل للفصل - إيصال السداد */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-400 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-lg font-bold text-green-600 mb-2">إيصال سداد رسوم الكشف المساحي</div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>رقم الطلب:</strong> {application.applicationNumber}
              </div>
              <div>
                <strong>اسم المستفيد:</strong> {application.applicationData.applicantName}
              </div>
              <div>
                <strong>المبلغ المستحق:</strong> {application.fees.toLocaleString()} ريال
              </div>
              <div>
                <strong>تاريخ الإصدار:</strong> {currentDate}
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-600">
              <div>• يرجى الاحتفاظ بهذا الإيصال لحين استلام النتائج</div>
              <div>• يمكن تتبع حالة الطلب باستخدام رقم الطلب</div>
            </div>
          </div>

          <div className="text-center ml-6">
            <div className="font-mono text-2xl font-bold border-2 border-black p-3 bg-white">
              {generateBarcode()}
            </div>
            <div className="text-xs mt-1">الرمز التسلسلي</div>
          </div>
        </div>
      </div>

    </div>
  );
}