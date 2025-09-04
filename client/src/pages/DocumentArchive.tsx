import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Upload, 
  Download, 
  Search, 
  Filter,
  Archive,
  Shield,
  Clock,
  User,
  Calendar,
  Tag,
  Folder,
  Eye,
  Edit3,
  Trash2,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  Signature,
  Lock,
  Key,
  History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';

interface Document {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  tags: string[];
  status: 'draft' | 'under_review' | 'approved' | 'rejected' | 'archived';
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  signatures: DocumentSignature[];
  permissions: DocumentPermission[];
  checksum: string;
  isEncrypted: boolean;
  retentionDate?: Date;
}

interface DocumentSignature {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  signedAt: Date;
  signatureHash: string;
  isValid: boolean;
  metadata: {
    ipAddress: string;
    location: string;
    device: string;
  };
}

interface DocumentPermission {
  userId: string;
  userName: string;
  permission: 'view' | 'edit' | 'sign' | 'admin';
  grantedAt: Date;
  grantedBy: string;
}

export default function DocumentArchive() {
  const [selectedView, setSelectedView] = useState('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for demonstration
  const mockDocuments: Document[] = [
    {
      id: '1',
      title: 'لائحة تراخيص البناء 2024',
      description: 'اللائحة المحدثة لتراخيص البناء للعام 2024',
      fileName: 'building_licenses_2024.pdf',
      fileSize: 2450000,
      mimeType: 'application/pdf',
      category: 'لوائح وقوانين',
      tags: ['تراخيص', 'بناء', '2024'],
      status: 'approved',
      version: '1.0',
      createdBy: 'أحمد المدير',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      signatures: [
        {
          id: '1',
          userId: '1',
          userName: 'أحمد المدير',
          userRole: 'مدير عام',
          signedAt: new Date('2024-01-20'),
          signatureHash: 'abc123def456',
          isValid: true,
          metadata: {
            ipAddress: '192.168.1.100',
            location: 'صنعاء، اليمن',
            device: 'Windows 10 Chrome'
          }
        }
      ],
      permissions: [],
      checksum: 'sha256:abc123def456789',
      isEncrypted: true,
      retentionDate: new Date('2029-01-15')
    },
    {
      id: '2',
      title: 'تقرير الأداء الشهري - يناير 2024',
      description: 'تقرير شامل عن أداء الإدارة لشهر يناير',
      fileName: 'monthly_report_jan_2024.docx',
      fileSize: 1230000,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      category: 'تقارير',
      tags: ['أداء', 'شهري', 'يناير'],
      status: 'under_review',
      version: '2.1',
      createdBy: 'فاطمة المحاسبة',
      createdAt: new Date('2024-01-25'),
      updatedAt: new Date('2024-01-28'),
      signatures: [],
      permissions: [],
      checksum: 'sha256:def456ghi789',
      isEncrypted: false
    },
    {
      id: '3',
      title: 'عقد مقاولة مشروع الطريق الجديد',
      description: 'عقد تنفيذ مشروع الطريق الجديد مع شركة البناء المتقدم',
      fileName: 'road_contract_2024.pdf',
      fileSize: 5670000,
      mimeType: 'application/pdf',
      category: 'عقود',
      tags: ['عقد', 'طريق', 'مقاولة'],
      status: 'draft',
      version: '1.0',
      createdBy: 'محمد المهندس',
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-03'),
      signatures: [],
      permissions: [],
      checksum: 'sha256:ghi789jkl012',
      isEncrypted: true,
      retentionDate: new Date('2034-02-01')
    }
  ];

  const categories = [
    'لوائح وقوانين',
    'تقارير',
    'عقود',
    'مراسلات',
    'قرارات إدارية',
    'مالية ومحاسبة',
    'موارد بشرية',
    'فنية وتقنية'
  ];

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/documents', searchTerm, filterCategory, filterStatus],
    queryFn: () => Promise.resolve(mockDocuments),
  });

  const uploadDocument = useMutation({
    mutationFn: async (documentData: any) => {
      // API call would go here
      return documentData;
    },
    onSuccess: () => {
      toast({
        title: "تم الرفع",
        description: "تم رفع المستند بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setShowUpload(false);
    },
  });

  const signDocument = useMutation({
    mutationFn: async ({ documentId, signature }: { documentId: string; signature: string }) => {
      // API call would go here
      return { documentId, signature };
    },
    onSuccess: () => {
      toast({
        title: "تم التوقيع",
        description: "تم توقيع المستند بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setShowSignature(false);
    },
  });

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = doc.title.includes(searchTerm) || 
                         doc.description.includes(searchTerm) || 
                         doc.fileName.includes(searchTerm) ||
                         doc.tags.some(tag => tag.includes(searchTerm));
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: Document['status']) => {
    switch (status) {
      case 'approved': return 'معتمد';
      case 'under_review': return 'قيد المراجعة';
      case 'rejected': return 'مرفوض';
      case 'archived': return 'مؤرشف';
      default: return 'مسودة';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    if (bytes === 0) return '0 بايت';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (documentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">جاري تحميل الأرشيف...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">نظام الأرشفة والتوقيع الإلكتروني</h1>
            <p className="text-gray-600 mt-2">إدارة شاملة للمستندات مع التوقيع الإلكتروني المؤمن</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Dialog open={showUpload} onOpenChange={setShowUpload}>
              <DialogTrigger asChild>
                <Button data-testid="upload-document">
                  <Upload className="w-4 h-4 ml-1" />
                  رفع مستند
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg" dir="rtl">
                <DialogHeader>
                  <DialogTitle>رفع مستند جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">عنوان المستند</Label>
                    <Input id="title" placeholder="أدخل عنوان المستند" />
                  </div>
                  <div>
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea id="description" placeholder="أدخل وصف المستند" />
                  </div>
                  <div>
                    <Label htmlFor="category">التصنيف</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="file">الملف</Label>
                    <Input id="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="encrypted" />
                    <Label htmlFor="encrypted" className="text-sm">تشفير المستند</Label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1" data-testid="upload-submit">
                      رفع المستند
                    </Button>
                    <Button variant="outline" onClick={() => setShowUpload(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">إجمالي المستندات</p>
                  <p className="text-2xl font-bold">{documents?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">مستندات معتمدة</p>
                  <p className="text-2xl font-bold">{documents?.filter(d => d.status === 'approved').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Signature className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">مستندات موقعة</p>
                  <p className="text-2xl font-bold">{documents?.filter(d => d.signatures.length > 0).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Lock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">مستندات مشفرة</p>
                  <p className="text-2xl font-bold">{documents?.filter(d => d.isEncrypted).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="البحث في المستندات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                    data-testid="search-documents"
                  />
                </div>
              </div>
              
              <div className="min-w-48">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="فلتر حسب التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التصنيفات</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="min-w-48">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="فلتر حسب الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="under_review">قيد المراجعة</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                    <SelectItem value="archived">مؤرشف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documents" data-testid="documents-tab">
              المستندات
            </TabsTrigger>
            <TabsTrigger value="signatures" data-testid="signatures-tab">
              التواقيع
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="audit-tab">
              سجل التدقيق
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  قائمة المستندات ({filteredDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`document-row-${doc.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                          <FileText className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{doc.title}</h3>
                          <p className="text-sm text-gray-600 mb-1">{doc.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {doc.createdBy}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {doc.createdAt.toLocaleDateString('ar-SA')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Archive className="w-3 h-3" />
                              {formatFileSize(doc.fileSize)}
                            </span>
                            {doc.isEncrypted && (
                              <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                مشفر
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <Badge className={getStatusColor(doc.status)}>
                            {getStatusText(doc.status)}
                          </Badge>
                          <div className="flex items-center gap-1 mt-1">
                            {doc.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDocument(doc);
                              setShowDocumentDetails(true);
                            }}
                            data-testid={`view-document-${doc.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`download-document-${doc.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          
                          {doc.status === 'under_review' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowSignature(true);
                              }}
                              data-testid={`sign-document-${doc.id}`}
                            >
                              <Signature className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredDocuments.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">لا يوجد مستندات مطابقة للبحث</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signatures" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Signature className="w-5 h-5" />
                  سجل التواقيع الإلكترونية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents?.flatMap(doc => doc.signatures.map(sig => ({ ...sig, documentTitle: doc.title, documentId: doc.id })))
                    .sort((a, b) => b.signedAt.getTime() - a.signedAt.getTime())
                    .map((sig, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Signature className="w-5 h-5 text-green-600" />
                        </div>
                        
                        <div>
                          <h4 className="font-medium">{sig.documentTitle}</h4>
                          <p className="text-sm text-gray-600">وقع بواسطة: {sig.userName} ({sig.userRole})</p>
                          <p className="text-xs text-gray-500">
                            {sig.signedAt.toLocaleDateString('ar-SA')} في {sig.signedAt.toLocaleTimeString('ar-SA')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={sig.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {sig.isValid ? 'صالح' : 'غير صالح'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Key className="w-4 h-4 ml-1" />
                          التحقق
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {documents?.every(doc => doc.signatures.length === 0) && (
                    <div className="text-center py-12">
                      <Signature className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">لا يوجد تواقيع إلكترونية</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  سجل التدقيق والمراجعة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <History className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">سجل التدقيق</h3>
                  <p className="text-gray-500 mb-4">قريباً - سجل شامل لجميع العمليات والتغييرات</p>
                  <Button variant="outline">
                    <Clock className="w-4 h-4 ml-1" />
                    عرض السجل
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Document Details Modal */}
        <Dialog open={showDocumentDetails} onOpenChange={setShowDocumentDetails}>
          <DialogContent className="max-w-4xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل المستند</DialogTitle>
            </DialogHeader>
            {selectedDocument && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">العنوان</Label>
                    <p className="mt-1 font-bold text-lg">{selectedDocument.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">الحالة</Label>
                    <Badge className={getStatusColor(selectedDocument.status) + ' mt-1'}>
                      {getStatusText(selectedDocument.status)}
                    </Badge>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700">الوصف</Label>
                    <p className="mt-1">{selectedDocument.description}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">اسم الملف</Label>
                    <p className="mt-1">{selectedDocument.fileName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">حجم الملف</Label>
                    <p className="mt-1">{formatFileSize(selectedDocument.fileSize)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">التصنيف</Label>
                    <p className="mt-1">{selectedDocument.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">الإصدار</Label>
                    <p className="mt-1">{selectedDocument.version}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">أنشئ بواسطة</Label>
                    <p className="mt-1">{selectedDocument.createdBy}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">تاريخ الإنشاء</Label>
                    <p className="mt-1">{selectedDocument.createdAt.toLocaleDateString('ar-SA')}</p>
                  </div>
                </div>
                
                {selectedDocument.signatures.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 block mb-2">التواقيع الإلكترونية</Label>
                    <div className="space-y-2">
                      {selectedDocument.signatures.map((sig, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{sig.userName}</p>
                            <p className="text-sm text-gray-600">{sig.userRole}</p>
                            <p className="text-xs text-gray-500">
                              {sig.signedAt.toLocaleDateString('ar-SA')} في {sig.signedAt.toLocaleTimeString('ar-SA')}
                            </p>
                          </div>
                          <Badge className={sig.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {sig.isValid ? '✓ صالح' : '✗ غير صالح'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Signature Modal */}
        <Dialog open={showSignature} onOpenChange={setShowSignature}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>توقيع المستند إلكترونياً</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <Signature className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                <h3 className="font-bold text-lg mb-2">تأكيد التوقيع</h3>
                <p className="text-gray-600 mb-4">
                  سيتم إنشاء توقيع إلكتروني مؤمن لهذا المستند
                </p>
              </div>
              
              <div>
                <Label htmlFor="signature-password">كلمة المرور للتوقيع</Label>
                <Input id="signature-password" type="password" placeholder="أدخل كلمة المرور" />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1" 
                  onClick={() => selectedDocument && signDocument.mutate({ 
                    documentId: selectedDocument.id, 
                    signature: 'digital_signature_hash' 
                  })}
                  data-testid="confirm-signature"
                >
                  <Signature className="w-4 h-4 ml-1" />
                  توقيع المستند
                </Button>
                <Button variant="outline" onClick={() => setShowSignature(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}