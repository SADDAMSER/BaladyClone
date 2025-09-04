import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building, Search, Plus, FileText, Calendar, User } from "lucide-react";

export default function BuildingLicenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["/api/applications"],
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-blue-100 text-blue-800",
    under_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    completed: "bg-purple-100 text-purple-800"
  };

  const statusLabels = {
    draft: "مسودة",
    submitted: "مقدم",
    under_review: "قيد المراجعة",
    approved: "معتمد",
    rejected: "مرفوض",
    completed: "مكتمل"
  };

  const mockApplications = [
    {
      id: "1",
      applicationNumber: "BL-2024-001",
      applicantName: "أحمد محمد الخولي",
      projectType: "مبنى سكني",
      status: "under_review",
      submissionDate: "2024-01-15",
      area: "250 م²",
      location: "صنعاء - شارع الزبيري"
    },
    {
      id: "2",
      applicationNumber: "BL-2024-002", 
      applicantName: "فاطمة علي السالمي",
      projectType: "مبنى تجاري",
      status: "approved",
      submissionDate: "2024-01-10",
      area: "400 م²",
      location: "صنعاء - شارع الحصبة"
    },
    {
      id: "3",
      applicationNumber: "BL-2024-003",
      applicantName: "محمد عبدالله الشامي",
      projectType: "فيلا سكنية",
      status: "submitted",
      submissionDate: "2024-01-20",
      area: "320 م²",
      location: "صنعاء - حي الصافية"
    }
  ];

  const displayApplications = (Array.isArray(applications) ? applications : mockApplications);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <Building className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-cairo">تراخيص البناء</h1>
              <p className="text-muted-foreground">إدارة وتتبع تراخيص البناء والإنشاءات</p>
            </div>
          </div>
          <Button 
            className="flex items-center space-x-2 space-x-reverse"
            data-testid="button-new-license"
          >
            <Plus size={16} />
            <span>طلب ترخيص جديد</span>
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">45</p>
                  <p className="text-muted-foreground text-sm">طلبات جديدة</p>
                </div>
                <FileText className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-secondary">32</p>
                  <p className="text-muted-foreground text-sm">قيد المراجعة</p>
                </div>
                <Calendar className="h-8 w-8 text-secondary/60" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-accent">189</p>
                  <p className="text-muted-foreground text-sm">تراخيص معتمدة</p>
                </div>
                <Building className="h-8 w-8 text-accent/60" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">7</p>
                  <p className="text-muted-foreground text-sm">متوسط أيام المعالجة</p>
                </div>
                <User className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-cairo">البحث والتصفية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="ابحث برقم الطلب، اسم المتقدم، أو الموقع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  data-testid="input-search-applications"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="حالة الطلب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="submitted">مقدم</SelectItem>
                  <SelectItem value="under_review">قيد المراجعة</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" data-testid="button-search-filter">
                <Search size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo">طلبات تراخيص البناء</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table data-testid="table-applications">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">اسم المتقدم</TableHead>
                    <TableHead className="text-right">نوع المشروع</TableHead>
                    <TableHead className="text-right">المساحة</TableHead>
                    <TableHead className="text-right">الموقع</TableHead>
                    <TableHead className="text-right">تاريخ التقديم</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayApplications.map((app: any) => (
                    <TableRow key={app.id} data-testid={`row-application-${app.id}`}>
                      <TableCell className="font-medium">{app.applicationNumber}</TableCell>
                      <TableCell>{app.applicantName}</TableCell>
                      <TableCell>{app.projectType}</TableCell>
                      <TableCell>{app.area}</TableCell>
                      <TableCell>{app.location}</TableCell>
                      <TableCell>{app.submissionDate}</TableCell>
                      <TableCell>
                        <Badge 
                          className={statusColors[app.status as keyof typeof statusColors]}
                          data-testid={`badge-status-${app.status}`}
                        >
                          {statusLabels[app.status as keyof typeof statusLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2 space-x-reverse">
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-view-${app.id}`}
                          >
                            عرض
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-edit-${app.id}`}
                          >
                            تعديل
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
