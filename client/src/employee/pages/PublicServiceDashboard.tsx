import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  User, 
  MapPin, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calculator,
  Search,
  Filter
} from "lucide-react";

interface ApplicationDetails {
  id: string;
  applicationNumber: string;
  serviceType: string;
  status: string;
  currentStage: string;
  submittedAt: string;
  applicantName: string;
  applicantId: string;
  contactPhone: string;
  email?: string;
  applicationData: {
    governorate?: string;
    district?: string;
    area?: string;
    landNumber?: string;
    plotNumber?: string;
    surveyType?: string;
    purpose?: string;
    description?: string;
  };
  fees?: string;
  isPaid?: boolean;
}

interface ReviewData {
  decision: 'approved' | 'rejected';
  notes: string;
  calculatedFees: number;
  reviewerComments: string;
}

export default function PublicServiceDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetails | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData>({
    decision: 'approved',
    notes: '',
    calculatedFees: 0,
    reviewerComments: ''
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch pending applications for review
  const { data: pendingApplications, isLoading: loadingPending } = useQuery<ApplicationDetails[]>({
    queryKey: ['/api/public-service/pending-applications'],
    retry: false,
    refetchOnWindowFocus: false
  });

  // Fetch reviewed applications
  const { data: reviewedApplications, isLoading: loadingReviewed } = useQuery<ApplicationDetails[]>({
    queryKey: ['/api/public-service/reviewed-applications'],
    retry: false,
    refetchOnWindowFocus: false
  });

  // Review application mutation
  const reviewMutation = useMutation({
    mutationFn: async (data: { applicationId: string; reviewData: ReviewData }) => {
      const response = await apiRequest('POST', `/api/applications/${data.applicationId}/public-service-review`, data.reviewData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: reviewData.decision === 'approved' ? "تم اعتماد الطلب بنجاح" : "تم رفض الطلب",
        variant: reviewData.decision === 'approved' ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/public-service/pending-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public-service/reviewed-applications'] });
      setSelectedApplication(null);
      setReviewData({ decision: 'approved', notes: '', calculatedFees: 0, reviewerComments: '' });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في معالجة المراجعة. حاول مرة أخرى.",
        variant: "destructive",
      });
      console.error('Review error:', error);
    },
  });

  const handleReview = () => {
    if (!selectedApplication) return;
    
    if (!reviewData.reviewerComments.trim()) {
      toast({
        title: "مطلوب",
        description: "يجب إضافة تعليق للمراجعة",
        variant: "destructive",
      });
      return;
    }

    reviewMutation.mutate({
      applicationId: selectedApplication.id,
      reviewData
    });
  };

  const calculateFees = (application: ApplicationDetails) => {
    // Fee calculation logic based on service type and area
    const baseFees = {
      'قرار المساحة': 5000,
      'ترخيص بناء': 15000,
      'ترخيص هدم': 8000,
      'ترخيص ترميم': 10000
    };
    
    const baseAmount = baseFees[application.serviceType as keyof typeof baseFees] || 5000;
    
    // Additional fees based on land area or other factors
    const areaMultiplier = application.applicationData.area ? 
      Math.min(parseInt(application.applicationData.area) / 100, 5) : 1;
    
    return Math.round(baseAmount * areaMultiplier);
  };

  useEffect(() => {
    if (selectedApplication) {
      const calculatedAmount = calculateFees(selectedApplication);
      setReviewData(prev => ({
        ...prev,
        calculatedFees: calculatedAmount
      }));
    }
  }, [selectedApplication]);

  const filteredApplications = (applications: ApplicationDetails[] | undefined) => {
    if (!applications || !searchTerm) return applications || [];
    
    return applications.filter(app => 
      app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicantId.includes(searchTerm)
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'submitted': { label: 'مقدم', variant: 'secondary' as const },
      'in_review': { label: 'قيد المراجعة', variant: 'default' as const },
      'approved': { label: 'معتمد', variant: 'default' as const },
      'rejected': { label: 'مرفوض', variant: 'destructive' as const },
      'pending_payment': { label: 'في انتظار السداد', variant: 'secondary' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              خدمة الجمهور - مراجعة الطلبات
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              مراجعة واعتماد طلبات الخدمات المقدمة من المواطنين
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="البحث برقم الطلب، اسم المتقدم، أو رقم الهوية..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                    data-testid="input-search-applications"
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" data-testid="button-filter">
                <Filter className="h-4 w-4 ml-2" />
                فلترة
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Applications List */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending" data-testid="tab-pending">
                  الطلبات المطلوب مراجعتها ({filteredApplications(pendingApplications)?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="reviewed" data-testid="tab-reviewed">
                  الطلبات المراجعة ({filteredApplications(reviewedApplications)?.length || 0})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="space-y-4">
                {loadingPending ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">جاري تحميل الطلبات...</p>
                  </div>
                ) : filteredApplications(pendingApplications)?.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">لا توجد طلبات مطلوب مراجعتها</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredApplications(pendingApplications)?.map((application) => (
                    <Card 
                      key={application.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedApplication?.id === application.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedApplication(application)}
                      data-testid={`card-application-${application.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                              {application.applicationNumber}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {application.serviceType}
                            </p>
                          </div>
                          {getStatusBadge(application.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center">
                            <User className="h-4 w-4 ml-2 text-gray-400" />
                            <span>{application.applicantName}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 ml-2 text-gray-400" />
                            <span>{new Date(application.submittedAt).toLocaleDateString('ar-SA')}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 ml-2 text-gray-400" />
                            <span>{application.applicationData.governorate}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 ml-2 text-gray-400" />
                            <span>{application.currentStage}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="reviewed" className="space-y-4">
                {loadingReviewed ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">جاري تحميل الطلبات...</p>
                  </div>
                ) : filteredApplications(reviewedApplications)?.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">لا توجد طلبات مراجعة</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredApplications(reviewedApplications)?.map((application) => (
                    <Card 
                      key={application.id} 
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => setSelectedApplication(application)}
                      data-testid={`card-reviewed-${application.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                              {application.applicationNumber}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {application.serviceType}
                            </p>
                          </div>
                          {getStatusBadge(application.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center">
                            <User className="h-4 w-4 ml-2 text-gray-400" />
                            <span>{application.applicantName}</span>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 ml-2 text-gray-400" />
                            <span>{application.fees ? `${application.fees} ريال` : 'لم يتم تحديد الرسوم'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-1">
            {selectedApplication ? (
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 ml-2" />
                    مراجعة الطلب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">تفاصيل الطلب</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>رقم الطلب:</strong> {selectedApplication.applicationNumber}</div>
                      <div><strong>نوع الخدمة:</strong> {selectedApplication.serviceType}</div>
                      <div><strong>اسم المتقدم:</strong> {selectedApplication.applicantName}</div>
                      <div><strong>رقم الهوية:</strong> {selectedApplication.applicantId}</div>
                      <div><strong>رقم الهاتف:</strong> {selectedApplication.contactPhone}</div>
                      {selectedApplication.applicationData.governorate && (
                        <div><strong>المحافظة:</strong> {selectedApplication.applicationData.governorate}</div>
                      )}
                      {selectedApplication.applicationData.district && (
                        <div><strong>المديرية:</strong> {selectedApplication.applicationData.district}</div>
                      )}
                      {selectedApplication.applicationData.purpose && (
                        <div><strong>الغرض:</strong> {selectedApplication.applicationData.purpose}</div>
                      )}
                    </div>
                  </div>

                  {activeTab === 'pending' && (
                    <>
                      <div>
                        <Label htmlFor="calculated-fees">الرسوم المحسوبة (ريال)</Label>
                        <div className="flex items-center mt-1">
                          <Calculator className="h-4 w-4 ml-2 text-gray-400" />
                          <Input
                            id="calculated-fees"
                            type="number"
                            value={reviewData.calculatedFees}
                            onChange={(e) => setReviewData(prev => ({
                              ...prev,
                              calculatedFees: parseInt(e.target.value) || 0
                            }))}
                            data-testid="input-calculated-fees"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="reviewer-comments">تعليقات المراجعة</Label>
                        <Textarea
                          id="reviewer-comments"
                          placeholder="أضف تعليقاتك على الطلب..."
                          value={reviewData.reviewerComments}
                          onChange={(e) => setReviewData(prev => ({
                            ...prev,
                            reviewerComments: e.target.value
                          }))}
                          className="mt-1"
                          data-testid="textarea-reviewer-comments"
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">ملاحظات إضافية</Label>
                        <Textarea
                          id="notes"
                          placeholder="ملاحظات للمتقدم أو الجهات التالية..."
                          value={reviewData.notes}
                          onChange={(e) => setReviewData(prev => ({
                            ...prev,
                            notes: e.target.value
                          }))}
                          className="mt-1"
                          data-testid="textarea-notes"
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => {
                            setReviewData(prev => ({ ...prev, decision: 'approved' }));
                            handleReview();
                          }}
                          className="flex-1"
                          disabled={reviewMutation.isPending}
                          data-testid="button-approve"
                        >
                          <CheckCircle className="h-4 w-4 ml-2" />
                          اعتماد
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setReviewData(prev => ({ ...prev, decision: 'rejected' }));
                            handleReview();
                          }}
                          className="flex-1"
                          disabled={reviewMutation.isPending}
                          data-testid="button-reject"
                        >
                          <XCircle className="h-4 w-4 ml-2" />
                          رفض
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="sticky top-6">
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    اختر طلباً لمراجعته
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}