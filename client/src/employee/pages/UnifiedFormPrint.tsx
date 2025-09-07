import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import UnifiedSurveyingForm from "../components/UnifiedSurveyingForm";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function UnifiedFormPrint() {
  const { id } = useParams<{ id: string }>();

  // Fetch application data
  const { data: application, isLoading, error } = useQuery({
    queryKey: ['/api/applications', id],
    queryFn: async () => {
      const token = localStorage.getItem('employee_token');
      localStorage.setItem("auth-token", token || '');
      
      try {
        const response = await apiRequest('GET', `/api/applications/${id}`);
        const data = await response.json();
        return data;
      } finally {
        localStorage.removeItem("auth-token");
      }
    },
    enabled: !!id
  });

  // Auto-print when component loads
  useEffect(() => {
    if (application && !isLoading) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [application, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div>جاري تحميل بيانات الطلب...</div>
        </Card>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-red-600 mb-4">خطأ في تحميل بيانات الطلب</div>
          <button 
            onClick={() => window.close()} 
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            إغلاق النافذة
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <UnifiedSurveyingForm 
        application={application} 
        barcode={`*${application.applicationNumber}*`}
      />
      
      {/* Print controls - hidden in print mode */}
      <div className="fixed bottom-4 right-4 print:hidden">
        <div className="flex gap-2">
          <button 
            onClick={() => window.print()}
            className="bg-green-600 text-white px-4 py-2 rounded shadow-lg hover:bg-green-700"
          >
            طباعة
          </button>
          <button 
            onClick={() => window.close()}
            className="bg-gray-500 text-white px-4 py-2 rounded shadow-lg hover:bg-gray-600"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}