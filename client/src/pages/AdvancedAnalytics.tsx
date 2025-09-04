import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Filter, 
  Calendar as CalendarIcon,
  Users,
  Building2,
  Clock,
  Target,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Activity,
  FileText,
  Eye
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import Header from '@/components/Header';

interface AnalyticsData {
  summary: {
    totalApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    pendingApplications: number;
    averageProcessingTime: number;
    revenueGenerated: number;
    customerSatisfaction: number;
    productivityIndex: number;
  };
  trends: {
    applicationsOverTime: Array<{ date: string; count: number; approved: number }>;
    departmentPerformance: Array<{ department: string; completed: number; pending: number }>;
    serviceUsage: Array<{ service: string; usage: number; satisfaction: number }>;
  };
  realTimeMetrics: {
    activeUsers: number;
    systemLoad: number;
    responseTime: number;
    errorRate: number;
  };
}

export default function AdvancedAnalytics() {
  const [selectedView, setSelectedView] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');

  // Mock data for demonstration
  const mockData: AnalyticsData = {
    summary: {
      totalApplications: 1247,
      approvedApplications: 1089,
      rejectedApplications: 67,
      pendingApplications: 91,
      averageProcessingTime: 2.3,
      revenueGenerated: 450000,
      customerSatisfaction: 4.7,
      productivityIndex: 94.5
    },
    trends: {
      applicationsOverTime: [
        { date: '2024-01', count: 120, approved: 105 },
        { date: '2024-02', count: 145, approved: 132 },
        { date: '2024-03', count: 167, approved: 151 },
        { date: '2024-04', count: 189, approved: 175 },
        { date: '2024-05', count: 203, approved: 189 },
        { date: '2024-06', count: 234, approved: 218 },
        { date: '2024-07', count: 189, approved: 179 }
      ],
      departmentPerformance: [
        { department: 'التراخيص', completed: 456, pending: 23 },
        { department: 'المساحة', completed: 342, pending: 18 },
        { department: 'الاشتراطات', completed: 291, pending: 31 },
        { department: 'المتابعة', completed: 187, pending: 19 }
      ],
      serviceUsage: [
        { service: 'ترخيص بناء سكني', usage: 547, satisfaction: 4.8 },
        { service: 'ترخيص بناء تجاري', usage: 324, satisfaction: 4.6 },
        { service: 'قرار مساحي', usage: 289, satisfaction: 4.7 },
        { service: 'اشتراطات فنية', usage: 167, satisfaction: 4.5 }
      ]
    },
    realTimeMetrics: {
      activeUsers: 127,
      systemLoad: 67.5,
      responseTime: 1.2,
      errorRate: 0.3
    }
  };

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/analytics/dashboard', dateRange, filterDepartment, filterService],
    queryFn: () => Promise.resolve(mockData),
  });

  const exportReport = (format: 'pdf' | 'excel') => {
    // Mock export functionality
    console.log(`Exporting report in ${format} format`);
  };

  const getPercentageChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change > 0
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">جاري تحميل التحليلات...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">التحليلات والتقارير المتقدمة</h1>
            <p className="text-gray-600 mt-2">لوحة تحكم شاملة لمراقبة الأداء واتخاذ القرارات</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="date-range-picker">
                  <CalendarIcon className="w-4 h-4 ml-1" />
                  {format(dateRange.from, 'dd/MM/yyyy', { locale: ar })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: ar })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportReport('excel')}
              data-testid="export-excel"
            >
              <Download className="w-4 h-4 ml-1" />
              Excel
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportReport('pdf')}
              data-testid="export-pdf"
            >
              <Download className="w-4 h-4 ml-1" />
              PDF
            </Button>
          </div>
        </div>

        {/* Real-time Metrics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              المؤشرات المباشرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">المستخدمون النشطون</p>
                  <p className="text-2xl font-bold text-blue-600">{analyticsData?.realTimeMetrics.activeUsers}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Activity className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">حمل النظام</p>
                  <p className="text-2xl font-bold text-green-600">{analyticsData?.realTimeMetrics.systemLoad}%</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">زمن الاستجابة</p>
                  <p className="text-2xl font-bold text-orange-600">{analyticsData?.realTimeMetrics.responseTime}ث</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">معدل الأخطاء</p>
                  <p className="text-2xl font-bold text-red-600">{analyticsData?.realTimeMetrics.errorRate}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="filterDepartment">القسم</Label>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأقسام</SelectItem>
                    <SelectItem value="licensing">التراخيص</SelectItem>
                    <SelectItem value="surveying">المساحة</SelectItem>
                    <SelectItem value="requirements">الاشتراطات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label htmlFor="filterService">الخدمة</Label>
                <Select value={filterService} onValueChange={setFilterService}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الخدمات</SelectItem>
                    <SelectItem value="residential">ترخيص سكني</SelectItem>
                    <SelectItem value="commercial">ترخيص تجاري</SelectItem>
                    <SelectItem value="surveying">قرار مساحي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button data-testid="apply-filters">
                <Filter className="w-4 h-4 ml-1" />
                تطبيق
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="overview-tab">
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="performance" data-testid="performance-tab">
              الأداء
            </TabsTrigger>
            <TabsTrigger value="trends" data-testid="trends-tab">
              الاتجاهات
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="reports-tab">
              التقارير
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">إجمالي الطلبات</p>
                      <p className="text-2xl font-bold">{analyticsData?.summary.totalApplications}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">+12.5%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">الطلبات المعتمدة</p>
                      <p className="text-2xl font-bold">{analyticsData?.summary.approvedApplications}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">+8.3%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">متوسط المعالجة</p>
                      <p className="text-2xl font-bold">{analyticsData?.summary.averageProcessingTime} يوم</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingDown className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">-15.2%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">الإيرادات المحققة</p>
                      <p className="text-2xl font-bold">{analyticsData?.summary.revenueGenerated.toLocaleString()} ريال</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">+24.7%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Applications Status Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>حالة الطلبات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">معتمدة</span>
                      <Badge className="bg-green-100 text-green-800">
                        {analyticsData?.summary.approvedApplications} ({Math.round((analyticsData?.summary.approvedApplications || 0) / (analyticsData?.summary.totalApplications || 1) * 100)}%)
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.round((analyticsData?.summary.approvedApplications || 0) / (analyticsData?.summary.totalApplications || 1) * 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">قيد المراجعة</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {analyticsData?.summary.pendingApplications} ({Math.round((analyticsData?.summary.pendingApplications || 0) / (analyticsData?.summary.totalApplications || 1) * 100)}%)
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full" 
                        style={{ width: `${Math.round((analyticsData?.summary.pendingApplications || 0) / (analyticsData?.summary.totalApplications || 1) * 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">مرفوضة</span>
                      <Badge className="bg-red-100 text-red-800">
                        {analyticsData?.summary.rejectedApplications} ({Math.round((analyticsData?.summary.rejectedApplications || 0) / (analyticsData?.summary.totalApplications || 1) * 100)}%)
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full" 
                        style={{ width: `${Math.round((analyticsData?.summary.rejectedApplications || 0) / (analyticsData?.summary.totalApplications || 1) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>مؤشرات الجودة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">رضا العملاء</span>
                        <span className="font-bold">{analyticsData?.summary.customerSatisfaction}/5</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(analyticsData?.summary.customerSatisfaction || 0) / 5 * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">مؤشر الإنتاجية</span>
                        <span className="font-bold">{analyticsData?.summary.productivityIndex}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${analyticsData?.summary.productivityIndex}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>أداء الأقسام</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.trends.departmentPerformance.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">{dept.department}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">مكتملة</p>
                          <p className="font-bold text-green-600">{dept.completed}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">معلقة</p>
                          <p className="font-bold text-orange-600">{dept.pending}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">الإنجاز</p>
                          <p className="font-bold text-blue-600">
                            {Math.round(dept.completed / (dept.completed + dept.pending) * 100)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>اتجاهات الطلبات عبر الوقت</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>رسم بياني لاتجاهات الطلبات</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>استخدام الخدمات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.trends.serviceUsage.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{service.service}</h4>
                        <p className="text-sm text-gray-600">{service.usage} استخدام</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">التقييم</p>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">{service.satisfaction}</span>
                            <span className="text-yellow-500">★</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-bold">تقرير الأداء الشهري</h3>
                      <p className="text-sm text-gray-600">تحليل شامل للأداء</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-4 h-4 ml-1" />
                    عرض التقرير
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="font-bold">تقرير KPIs</h3>
                      <p className="text-sm text-gray-600">مؤشرات الأداء الرئيسية</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-4 h-4 ml-1" />
                    عرض التقرير
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="w-8 h-8 text-purple-600" />
                    <div>
                      <h3 className="font-bold">التقرير المالي</h3>
                      <p className="text-sm text-gray-600">الإيرادات والتكاليف</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-4 h-4 ml-1" />
                    عرض التقرير
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}