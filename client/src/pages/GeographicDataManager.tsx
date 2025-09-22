import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  Search,
  Save,
  X,
  Map,
  Globe,
  Building,
  Eye
} from 'lucide-react';
import InteractiveDrawingMap from '@/components/gis/InteractiveDrawingMap';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { insertGovernorateSchema, insertDistrictSchema, type InsertGovernorate, type InsertDistrict } from '@shared/schema';
import { useBasemapQuery } from '@/hooks/useBasemapQuery';

// Form schemas - extending the shared schemas with JSON string handling and proper nullability
const governorateFormSchema = insertGovernorateSchema.extend({
  geometry: z.string().optional(),
  properties: z.string().optional(),
  nameEn: z.string().min(1, 'الاسم الإنجليزي مطلوب'),
  isActive: z.boolean().default(true),
});

const districtFormSchema = insertDistrictSchema.extend({
  geometry: z.string().optional(),
  properties: z.string().optional(),
  code: z.string().optional(),
  nameEn: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Safe JSON parsing utility
const safeJsonParse = (jsonString: string | undefined, fieldName: string): any => {
  if (!jsonString?.trim()) return null;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`خطأ في تنسيق ${fieldName}: يجب أن يكون JSON صحيح`);
  }
};

type GovernorateFormData = z.infer<typeof governorateFormSchema>;
type DistrictFormData = z.infer<typeof districtFormSchema>;

interface Governorate {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  geometry?: any;
  properties?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface District {
  id: string;
  code?: string;
  nameAr: string;
  nameEn?: string;
  governorateId: string;
  geometry?: any;
  properties?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SubDistrict {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  districtId: string;
  geometry?: any;
  properties?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Sector {
  id: string;
  code?: string;
  nameAr: string;
  nameEn?: string;
  subDistrictId: string;
  sectorType?: string;
  geometry?: any;
  properties?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NeighborhoodUnit {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  sectorId?: string;
  neighborhoodId?: string;
  geometry?: any;
  properties?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Block {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  neighborhoodUnitId: string;
  blockType?: string;
  geometry?: any;
  properties?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interface for basemap overlay data
interface BasemapOverlay {
  url: string;
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  opacity: number;
  expiresAt: string;
}

interface BasemapLayer {
  id: string;
  status: string;
  overlay: BasemapOverlay;
  metadata: {
    taskType: string;
    targetType: string;
    targetId: string;
    filename?: string;
    createdAt: string;
    completedAt?: string;
  };
}

export default function GeographicDataManager() {
  const [activeTab, setActiveTab] = useState('governorates');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddGovernorate, setShowAddGovernorate] = useState(false);
  const [showEditGovernorate, setShowEditGovernorate] = useState(false);
  const [showAddDistrict, setShowAddDistrict] = useState(false);
  const [showEditDistrict, setShowEditDistrict] = useState(false);
  const [selectedGovernorate, setSelectedGovernorate] = useState<Governorate | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedGovernorateFilter, setSelectedGovernorateFilter] = useState<string>('all');
  const [mapSelectedGovernorateId, setMapSelectedGovernorateId] = useState<string>('');
  const [mapSelectedDistrictId, setMapSelectedDistrictId] = useState<string>('');
  const [mapSelectedSubDistrictId, setMapSelectedSubDistrictId] = useState<string>('');
  const [mapSelectedSectorId, setMapSelectedSectorId] = useState<string>('');
  const [mapSelectedNeighborhoodUnitId, setMapSelectedNeighborhoodUnitId] = useState<string>('');
  const [mapSelectedBlockId, setMapSelectedBlockId] = useState<string>('');
  
  // Basemap state management - now using react-query
  const [isBasemapVisible, setIsBasemapVisible] = useState<boolean>(true);
  
  // Use basemap query hook instead of manual state management
  const { 
    data: basemapLayer, 
    isLoading: isLoadingBasemap, 
    isError: isBasemapError 
  } = useBasemapQuery('neighborhoodUnit', mapSelectedNeighborhoodUnitId || '');

  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // GeoTIFF Upload mutation
  const uploadGeoTiffMutation = useMutation({
    mutationFn: async ({ file, targetId }: { file: File; targetId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskType', 'geotiff_basemap');
      formData.append('targetType', 'neighborhoodUnit');
      formData.append('targetId', targetId);
      formData.append('priority', '1');

      const response = await fetch('/api/geo-jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token') || 'mock-token'}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ GeoTIFF upload successful:', data);
      
      // Show success toast
      toast({
        title: 'تم رفع الملف بنجاح',
        description: `بدأت معالجة ملف GeoTIFF للوحدة الجوارية. سيتم عرض النتائج عند اكتمال المعالجة.`,
        variant: 'default'
      });

      // Close dialog and reset state
      setShowUploadDialog(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Invalidate basemap query to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ['/api/geo-jobs', { 
          targetType: 'neighborhoodUnit', 
          targetId: mapSelectedNeighborhoodUnitId, 
          includeOverlay: true 
        }]
      });
    },
    onError: (error: Error) => {
      console.error('❌ GeoTIFF upload failed:', error);
      
      toast({
        title: 'فشل في رفع الملف',
        description: error.message || 'حدث خطأ أثناء رفع ملف GeoTIFF',
        variant: 'destructive'
      });
    }
  });

  // Fetch governorates
  const { data: governorates = [], isLoading: loadingGovernorates } = useQuery<Governorate[]>({
    queryKey: ['/api/governorates'],
  });

  // Fetch districts
  const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
    queryKey: ['/api/districts'],
  });

  // Fetch all data for global statistics  
  const { data: allSubDistricts = [] } = useQuery<SubDistrict[]>({
    queryKey: ['/api/sub-districts'],
  });

  const { data: allSectors = [] } = useQuery<Sector[]>({
    queryKey: ['/api/sectors'],
  });

  const { data: allNeighborhoodUnits = [] } = useQuery<NeighborhoodUnit[]>({
    queryKey: ['/api/neighborhood-units'],
  });

  const { data: allBlocks = [] } = useQuery<Block[]>({
    queryKey: ['/api/blocks'],
  });

  // Fetch filtered data based on selections for map display
  const { data: subDistricts = [], isLoading: loadingSubDistricts } = useQuery<SubDistrict[]>({
    queryKey: ['sub-districts', mapSelectedDistrictId],
    queryFn: () => fetch(`/api/sub-districts?districtId=${mapSelectedDistrictId}`).then(res => res.json()),
    enabled: !!mapSelectedDistrictId,
    select: (data: any[]) => (data || [])
  });

  const { data: sectors = [] } = useQuery<Sector[]>({
    queryKey: ['sectors', mapSelectedSubDistrictId],
    queryFn: () => fetch(`/api/sectors?subDistrictId=${mapSelectedSubDistrictId}`).then(res => res.json()),
    enabled: !!mapSelectedSubDistrictId,
    select: (data: any[]) => (data || [])
  });

  const { data: neighborhoodUnits = [] } = useQuery<NeighborhoodUnit[]>({
    queryKey: ['neighborhood-units', mapSelectedSectorId],
    queryFn: () => fetch(`/api/neighborhood-units?sectorId=${mapSelectedSectorId}`).then(res => res.json()),
    enabled: !!mapSelectedSectorId,
  });

  const { data: blocks = [] } = useQuery<Block[]>({
    queryKey: ['blocks', mapSelectedNeighborhoodUnitId],
    queryFn: () => fetch(`/api/blocks?neighborhoodUnitId=${mapSelectedNeighborhoodUnitId}`).then(res => res.json()),
    enabled: !!mapSelectedNeighborhoodUnitId,
  });

  // Reset downstream selections when upstream changes
  useEffect(() => {
    if (mapSelectedGovernorateId) {
      setMapSelectedDistrictId('');
      setMapSelectedSubDistrictId('');
      setMapSelectedSectorId('');
      setMapSelectedNeighborhoodUnitId('');
      setMapSelectedBlockId('');
    }
  }, [mapSelectedGovernorateId]);

  useEffect(() => {
    if (mapSelectedDistrictId) {
      setMapSelectedSubDistrictId('');
      setMapSelectedSectorId('');
      setMapSelectedNeighborhoodUnitId('');
      setMapSelectedBlockId('');
    }
  }, [mapSelectedDistrictId]);

  useEffect(() => {
    if (mapSelectedSubDistrictId) {
      setMapSelectedSectorId('');
      setMapSelectedNeighborhoodUnitId('');
      setMapSelectedBlockId('');
    }
  }, [mapSelectedSubDistrictId]);

  useEffect(() => {
    if (mapSelectedSectorId) {
      setMapSelectedNeighborhoodUnitId('');
      setMapSelectedBlockId('');
    }
  }, [mapSelectedSectorId]);

  useEffect(() => {
    if (mapSelectedNeighborhoodUnitId) {
      setMapSelectedBlockId('');
    }
  }, [mapSelectedNeighborhoodUnitId]);

  // Basemap data is now handled by useBasemapQuery hook above

  // Auto-focus map on selected region (to be implemented in map component)
  const focusRegion = useMemo(() => {
    if (mapSelectedBlockId) return { type: 'block', id: mapSelectedBlockId };
    if (mapSelectedNeighborhoodUnitId) return { type: 'neighborhoodUnit', id: mapSelectedNeighborhoodUnitId };
    if (mapSelectedSectorId) return { type: 'sector', id: mapSelectedSectorId };
    if (mapSelectedSubDistrictId) return { type: 'subDistrict', id: mapSelectedSubDistrictId };
    if (mapSelectedDistrictId) return { type: 'district', id: mapSelectedDistrictId };
    if (mapSelectedGovernorateId) return { type: 'governorate', id: mapSelectedGovernorateId };
    return null;
  }, [mapSelectedGovernorateId, mapSelectedDistrictId, mapSelectedSubDistrictId, mapSelectedSectorId, mapSelectedNeighborhoodUnitId, mapSelectedBlockId]);

  // Create governorate mutation
  const createGovernorateMutation = useMutation({
    mutationFn: async (data: GovernorateFormData) => {
      try {
        const response = await apiRequest('POST', '/api/governorates', {
          ...data,
          geometry: safeJsonParse(data.geometry, 'البيانات الجغرافية'),
          properties: safeJsonParse(data.properties, 'الخصائص الإضافية'),
        });
        return response.json();
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/governorates'] });
      setShowAddGovernorate(false);
      toast({ title: 'تم إضافة المحافظة بنجاح' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'خطأ في إضافة المحافظة', 
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive' 
      });
    },
  });

  // Update governorate mutation
  const updateGovernorateMutation = useMutation({
    mutationFn: async (data: GovernorateFormData & { id: string }) => {
      try {
        const response = await apiRequest('PUT', `/api/governorates/${data.id}`, {
          ...data,
          geometry: safeJsonParse(data.geometry, 'البيانات الجغرافية'),
          properties: safeJsonParse(data.properties, 'الخصائص الإضافية'),
        });
        return response.json();
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/governorates'] });
      setShowEditGovernorate(false);
      setSelectedGovernorate(null);
      toast({ title: 'تم تحديث المحافظة بنجاح' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'خطأ في تحديث المحافظة', 
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive' 
      });
    },
  });

  // Delete governorate mutation
  const deleteGovernorateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/governorates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/governorates'] });
      toast({ title: 'تم حذف المحافظة بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ في حذف المحافظة', variant: 'destructive' });
    },
  });

  // Create district mutation
  const createDistrictMutation = useMutation({
    mutationFn: async (data: DistrictFormData) => {
      try {
        const response = await apiRequest('POST', '/api/districts', {
          ...data,
          geometry: safeJsonParse(data.geometry, 'البيانات الجغرافية'),
          properties: safeJsonParse(data.properties, 'الخصائص الإضافية'),
        });
        return response.json();
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      setShowAddDistrict(false);
      toast({ title: 'تم إضافة المديرية بنجاح' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'خطأ في إضافة المديرية', 
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive' 
      });
    },
  });

  // Update district mutation
  const updateDistrictMutation = useMutation({
    mutationFn: async (data: DistrictFormData & { id: string }) => {
      try {
        const response = await apiRequest('PUT', `/api/districts/${data.id}`, {
          ...data,
          geometry: safeJsonParse(data.geometry, 'البيانات الجغرافية'),
          properties: safeJsonParse(data.properties, 'الخصائص الإضافية'),
        });
        return response.json();
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      setShowEditDistrict(false);
      setSelectedDistrict(null);
      toast({ title: 'تم تحديث المديرية بنجاح' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'خطأ في تحديث المديرية', 
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive' 
      });
    },
  });

  // Delete district mutation
  const deleteDistrictMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/districts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({ title: 'تم حذف المديرية بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ في حذف المديرية', variant: 'destructive' });
    },
  });

  // Form hooks
  const governorateForm = useForm<GovernorateFormData>({
    resolver: zodResolver(governorateFormSchema),
    defaultValues: {
      code: '',
      nameAr: '',
      nameEn: '',
      geometry: '',
      properties: '',
      isActive: true,
    },
  });

  const districtForm = useForm<DistrictFormData>({
    resolver: zodResolver(districtFormSchema),
    defaultValues: {
      code: '',
      nameAr: '',
      nameEn: '',
      governorateId: '',
      geometry: '',
      properties: '',
      isActive: true,
    },
  });

  // Filter functions
  const filteredGovernorates = governorates.filter(gov => 
    gov.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gov.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gov.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDistricts = districts.filter(dist => {
    const matchesSearch = dist.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dist.nameEn && dist.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dist.code && dist.code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGovernorate = selectedGovernorateFilter === 'all' || 
      dist.governorateId === selectedGovernorateFilter;
    
    return matchesSearch && matchesGovernorate;
  });

  // Handle form submissions
  const onSubmitGovernorate = (data: GovernorateFormData) => {
    if (selectedGovernorate) {
      updateGovernorateMutation.mutate({ ...data, id: selectedGovernorate.id });
    } else {
      createGovernorateMutation.mutate(data);
    }
  };

  const onSubmitDistrict = (data: DistrictFormData) => {
    if (selectedDistrict) {
      updateDistrictMutation.mutate({ ...data, id: selectedDistrict.id });
    } else {
      createDistrictMutation.mutate(data);
    }
  };

  // Handle edit
  const handleEditGovernorate = (governorate: Governorate) => {
    setSelectedGovernorate(governorate);
    governorateForm.reset({
      code: governorate.code,
      nameAr: governorate.nameAr,
      nameEn: governorate.nameEn,
      geometry: governorate.geometry ? JSON.stringify(governorate.geometry, null, 2) : '',
      properties: governorate.properties ? JSON.stringify(governorate.properties, null, 2) : '',
      isActive: governorate.isActive,
    });
    setShowEditGovernorate(true);
  };

  const handleEditDistrict = (district: District) => {
    setSelectedDistrict(district);
    districtForm.reset({
      code: district.code || '',
      nameAr: district.nameAr,
      nameEn: district.nameEn || '',
      governorateId: district.governorateId,
      geometry: district.geometry ? JSON.stringify(district.geometry, null, 2) : '',
      properties: district.properties ? JSON.stringify(district.properties, null, 2) : '',
      isActive: district.isActive,
    });
    setShowEditDistrict(true);
  };

  // Get governorate name
  const getGovernorateName = (id: string) => {
    const gov = governorates.find(g => g.id === id);
    return gov ? gov.nameAr : 'غير محدد';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Map className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            إدارة البيانات الجغرافية
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="governorates" className="flex items-center gap-2" data-testid="tab-governorates">
              <Globe className="h-4 w-4" />
              المحافظات
            </TabsTrigger>
            <TabsTrigger value="districts" className="flex items-center gap-2" data-testid="tab-districts">
              <Building className="h-4 w-4" />
              المديريات
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2" data-testid="tab-map">
              <Eye className="h-4 w-4" />
              معاينة الخريطة
            </TabsTrigger>
          </TabsList>

          {/* Governorates Tab */}
          <TabsContent value="governorates" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    إدارة المحافظات
                  </CardTitle>
                  <Dialog open={showAddGovernorate} onOpenChange={setShowAddGovernorate}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => {
                          governorateForm.reset();
                          setSelectedGovernorate(null);
                        }}
                        data-testid="button-add-governorate"
                      >
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة محافظة
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl" dir="rtl">
                      <DialogHeader>
                        <DialogTitle>
                          {selectedGovernorate ? 'تعديل المحافظة' : 'إضافة محافظة جديدة'}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...governorateForm}>
                        <form onSubmit={governorateForm.handleSubmit(onSubmitGovernorate)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={governorateForm.control}
                              name="code"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>رمز المحافظة *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="مثال: YE01" {...field} data-testid="input-governorate-code" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={governorateForm.control}
                              name="nameAr"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الاسم العربي *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="صنعاء" {...field} data-testid="input-governorate-name-ar" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={governorateForm.control}
                              name="nameEn"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الاسم الإنجليزي *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Sana'a" {...field} data-testid="input-governorate-name-en" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={governorateForm.control}
                              name="isActive"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>نشط</FormLabel>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-governorate-active"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={governorateForm.control}
                            name="geometry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>البيانات الجغرافية (JSON)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder='{"type": "Polygon", "coordinates": [...]}'
                                    className="h-24"
                                    {...field}
                                    data-testid="textarea-governorate-geometry"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={governorateForm.control}
                            name="properties"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>خصائص إضافية (JSON)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder='{"population": 1000000, "area": 1000}'
                                    className="h-20"
                                    {...field}
                                    data-testid="textarea-governorate-properties"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddGovernorate(false)}
                              data-testid="button-cancel-governorate"
                            >
                              <X className="h-4 w-4 ml-2" />
                              إلغاء
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createGovernorateMutation.isPending || updateGovernorateMutation.isPending}
                              data-testid="button-save-governorate"
                            >
                              <Save className="h-4 w-4 ml-2" />
                              {selectedGovernorate ? 'تحديث' : 'حفظ'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="البحث في المحافظات..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                      data-testid="input-search-governorates"
                    />
                  </div>
                </div>

                {loadingGovernorates ? (
                  <div className="text-center py-8">جاري التحميل...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الرمز</TableHead>
                        <TableHead>الاسم العربي</TableHead>
                        <TableHead>الاسم الإنجليزي</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGovernorates.map((governorate) => (
                        <TableRow key={governorate.id} data-testid={`row-governorate-${governorate.id}`}>
                          <TableCell>
                            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {governorate.code}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium">{governorate.nameAr}</TableCell>
                          <TableCell>{governorate.nameEn}</TableCell>
                          <TableCell>
                            <Badge variant={governorate.isActive ? "default" : "secondary"}>
                              {governorate.isActive ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {governorate.geometry && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setActiveTab('map');
                                    setMapSelectedGovernorateId(governorate.id);
                                    setMapSelectedDistrictId('');
                                  }}
                                  data-testid={`button-view-governorate-${governorate.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditGovernorate(governorate)}
                                data-testid={`button-edit-governorate-${governorate.id}`}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteGovernorateMutation.mutate(governorate.id)}
                                disabled={deleteGovernorateMutation.isPending}
                                data-testid={`button-delete-governorate-${governorate.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

          {/* Districts Tab */}
          <TabsContent value="districts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    إدارة المديريات
                  </CardTitle>
                  <Dialog open={showAddDistrict} onOpenChange={setShowAddDistrict}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => {
                          districtForm.reset();
                          setSelectedDistrict(null);
                        }}
                        data-testid="button-add-district"
                      >
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة مديرية
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl" dir="rtl">
                      <DialogHeader>
                        <DialogTitle>
                          {selectedDistrict ? 'تعديل المديرية' : 'إضافة مديرية جديدة'}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...districtForm}>
                        <form onSubmit={districtForm.handleSubmit(onSubmitDistrict)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={districtForm.control}
                              name="code"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>رمز المديرية</FormLabel>
                                  <FormControl>
                                    <Input placeholder="مثال: YE01001" {...field} data-testid="input-district-code" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={districtForm.control}
                              name="nameAr"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الاسم العربي *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="الصافية" {...field} data-testid="input-district-name-ar" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={districtForm.control}
                              name="nameEn"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الاسم الإنجليزي</FormLabel>
                                  <FormControl>
                                    <Input placeholder="As Safiyah" {...field} data-testid="input-district-name-en" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={districtForm.control}
                              name="governorateId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>المحافظة *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-district-governorate">
                                        <SelectValue placeholder="اختر المحافظة" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {governorates.map((gov) => (
                                        <SelectItem key={gov.id} value={gov.id}>
                                          {gov.nameAr}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={districtForm.control}
                              name="isActive"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>نشط</FormLabel>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-district-active"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={districtForm.control}
                            name="geometry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>البيانات الجغرافية (JSON)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder='{"type": "Polygon", "coordinates": [...]}'
                                    className="h-24"
                                    {...field}
                                    data-testid="textarea-district-geometry"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={districtForm.control}
                            name="properties"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>خصائص إضافية (JSON)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder='{"population": 50000, "area": 100}'
                                    className="h-20"
                                    {...field}
                                    data-testid="textarea-district-properties"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddDistrict(false)}
                              data-testid="button-cancel-district"
                            >
                              <X className="h-4 w-4 ml-2" />
                              إلغاء
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createDistrictMutation.isPending || updateDistrictMutation.isPending}
                              data-testid="button-save-district"
                            >
                              <Save className="h-4 w-4 ml-2" />
                              {selectedDistrict ? 'تحديث' : 'حفظ'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="البحث في المديريات..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                      data-testid="input-search-districts"
                    />
                  </div>
                  <Select value={selectedGovernorateFilter} onValueChange={setSelectedGovernorateFilter}>
                    <SelectTrigger className="w-48" data-testid="select-filter-governorate">
                      <SelectValue placeholder="فلترة حسب المحافظة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المحافظات</SelectItem>
                      {governorates.map((gov) => (
                        <SelectItem key={gov.id} value={gov.id}>
                          {gov.nameAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {loadingDistricts ? (
                  <div className="text-center py-8">جاري التحميل...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الرمز</TableHead>
                        <TableHead>الاسم العربي</TableHead>
                        <TableHead>الاسم الإنجليزي</TableHead>
                        <TableHead>المحافظة</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDistricts.map((district) => (
                        <TableRow key={district.id} data-testid={`row-district-${district.id}`}>
                          <TableCell>
                            {district.code ? (
                              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {district.code}
                              </code>
                            ) : (
                              <span className="text-gray-400">غير محدد</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{district.nameAr}</TableCell>
                          <TableCell>{district.nameEn || 'غير محدد'}</TableCell>
                          <TableCell>{getGovernorateName(district.governorateId)}</TableCell>
                          <TableCell>
                            <Badge variant={district.isActive ? "default" : "secondary"}>
                              {district.isActive ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {district.geometry && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setActiveTab('map');
                                    setMapSelectedGovernorateId(district.governorateId);
                                    setMapSelectedDistrictId(district.id);
                                  }}
                                  data-testid={`button-view-district-${district.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditDistrict(district)}
                                data-testid={`button-edit-district-${district.id}`}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteDistrictMutation.mutate(district.id)}
                                disabled={deleteDistrictMutation.isPending}
                                data-testid={`button-delete-district-${district.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
          
          {/* Interactive Map Tab */}
          <TabsContent value="map" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  معاينة الحدود الجغرافية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Control Panel */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">اختيار المحافظة</Label>
                      <Select 
                        value={mapSelectedGovernorateId || 'all'} 
                        onValueChange={(value) => {
                          const selectedValue = value === 'all' ? '' : value;
                          setMapSelectedGovernorateId(selectedValue);
                          // Reset all downstream selections
                          setMapSelectedDistrictId('');
                          setMapSelectedSubDistrictId('');
                          setMapSelectedSectorId('');
                          setMapSelectedNeighborhoodUnitId('');
                          setMapSelectedBlockId('');
                        }}
                      >
                        <SelectTrigger data-testid="select-map-governorate">
                          <SelectValue placeholder="اختر المحافظة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع المحافظات</SelectItem>
                          {governorates
                            .filter(gov => gov.geometry) // Only show governorates with geometry
                            .map((gov) => (
                            <SelectItem key={gov.id} value={gov.id}>
                              {gov.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {mapSelectedGovernorateId && (
                      <div>
                        <Label className="text-sm font-medium">اختيار المديرية</Label>
                        <Select 
                          value={mapSelectedDistrictId || 'all'} 
                          onValueChange={(value) => {
                            const selectedValue = value === 'all' ? '' : value;
                            setMapSelectedDistrictId(selectedValue);
                            // Reset downstream selections
                            setMapSelectedSubDistrictId('');
                            setMapSelectedSectorId('');
                            setMapSelectedNeighborhoodUnitId('');
                            setMapSelectedBlockId('');
                          }}
                        >
                          <SelectTrigger data-testid="select-map-district">
                            <SelectValue placeholder="اختر المديرية" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع المديريات</SelectItem>
                            {districts
                              .filter(dist => 
                                dist.governorateId === mapSelectedGovernorateId && 
                                dist.geometry
                              )
                              .map((dist) => (
                              <SelectItem key={dist.id} value={dist.id}>
                                {dist.nameAr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Sub-District Filter */}
                    {mapSelectedDistrictId && (
                      <div>
                        <Label className="text-sm font-medium">اختيار العزلة</Label>
                        <Select 
                          value={mapSelectedSubDistrictId || 'all'} 
                          onValueChange={(value) => {
                            const selectedValue = value === 'all' ? '' : value;
                            setMapSelectedSubDistrictId(selectedValue);
                            // Reset downstream selections
                            setMapSelectedSectorId('');
                            setMapSelectedNeighborhoodUnitId('');
                            setMapSelectedBlockId('');
                          }}
                        >
                          <SelectTrigger data-testid="select-map-subdistrict">
                            <SelectValue placeholder="اختر العزلة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع العزل</SelectItem>
                            {subDistricts
                              .filter(subdist => subdist.geometry)
                              .map((subdist) => (
                              <SelectItem key={subdist.id} value={subdist.id}>
                                {subdist.nameAr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Sector Filter */}
                    {mapSelectedSubDistrictId && (
                      <div>
                        <Label className="text-sm font-medium">اختيار القطاع</Label>
                        <Select 
                          value={mapSelectedSectorId || 'all'} 
                          onValueChange={(value) => {
                            const selectedValue = value === 'all' ? '' : value;
                            setMapSelectedSectorId(selectedValue);
                            // Reset downstream selections
                            setMapSelectedNeighborhoodUnitId('');
                            setMapSelectedBlockId('');
                          }}
                        >
                          <SelectTrigger data-testid="select-map-sector">
                            <SelectValue placeholder="اختر القطاع" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع القطاعات</SelectItem>
                            {sectors
                              .filter(sector => sector.geometry)
                              .map((sector) => (
                              <SelectItem key={sector.id} value={sector.id}>
                                {sector.nameAr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Neighborhood Unit Filter */}
                    {mapSelectedSectorId && (
                      <div>
                        <Label className="text-sm font-medium">اختيار وحدة الجوار</Label>
                        <Select 
                          value={mapSelectedNeighborhoodUnitId || 'all'} 
                          onValueChange={(value) => {
                            const selectedValue = value === 'all' ? '' : value;
                            setMapSelectedNeighborhoodUnitId(selectedValue);
                            // Reset downstream selections
                            setMapSelectedBlockId('');
                          }}
                        >
                          <SelectTrigger data-testid="select-map-neighborhood-unit">
                            <SelectValue placeholder="اختر وحدة الجوار" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع وحدات الجوار</SelectItem>
                            {neighborhoodUnits
                              .filter(unit => unit.geometry)
                              .map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.nameAr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Block Filter */}
                    {mapSelectedNeighborhoodUnitId && (
                      <div>
                        <Label className="text-sm font-medium">اختيار البلوك</Label>
                        <Select 
                          value={mapSelectedBlockId || 'all'} 
                          onValueChange={(value) => {
                            const selectedValue = value === 'all' ? '' : value;
                            setMapSelectedBlockId(selectedValue);
                          }}
                        >
                          <SelectTrigger data-testid="select-map-block">
                            <SelectValue placeholder="اختر البلوك" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع البلوكات</SelectItem>
                            {blocks
                              .filter(block => block.geometry)
                              .map((block) => (
                              <SelectItem key={block.id} value={block.id}>
                                {block.nameAr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">إحصائيات شاملة للنظام</h4>
                      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                        {/* Global Statistics */}
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                          <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">البيانات الإجمالية</div>
                          <div>المحافظات: {governorates.length} (مع خرائط: {governorates.filter(g => g.geometry).length})</div>
                          <div>المديريات: {districts.length} (مع خرائط: {districts.filter(d => d.geometry).length})</div>
                          <div>العزل: {allSubDistricts.length} (مع خرائط: {allSubDistricts.filter(s => s.geometry).length})</div>
                          <div>القطاعات: {allSectors.length} (مع خرائط: {allSectors.filter(s => s.geometry).length})</div>
                          <div>الوحدات الجوارية: {allNeighborhoodUnits.length} (مع خرائط: {allNeighborhoodUnits.filter(n => n.geometry).length})</div>
                          <div>البلوكات: {allBlocks.length} (مع خرائط: {allBlocks.filter(b => b.geometry).length})</div>
                        </div>
                        
                        {/* Filtered Statistics */}
                        {(mapSelectedDistrictId || mapSelectedGovernorateId || mapSelectedSectorId || mapSelectedNeighborhoodUnitId) && (
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">المرشحة حسب الاختيار</div>
                            {mapSelectedDistrictId && (
                              <div>العزل المتاحة: {subDistricts.length} (مع خرائط: {subDistricts.filter(s => s.geometry).length})</div>
                            )}
                            {mapSelectedGovernorateId && (
                              <div>القطاعات المتاحة: {sectors.length} (مع خرائط: {sectors.filter(s => s.geometry).length})</div>
                            )}
                            {mapSelectedSectorId && (
                              <div>وحدات الجوار المتاحة: {neighborhoodUnits.length} (مع خرائط: {neighborhoodUnits.filter(n => n.geometry).length})</div>
                            )}
                            {mapSelectedNeighborhoodUnitId && (
                              <div>البلوكات المتاحة: {blocks.length} (مع خرائط: {blocks.filter(b => b.geometry).length})</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {(mapSelectedGovernorateId || mapSelectedDistrictId || mapSelectedSubDistrictId || mapSelectedSectorId || mapSelectedNeighborhoodUnitId || mapSelectedBlockId) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setMapSelectedGovernorateId('');
                          setMapSelectedDistrictId('');
                          setMapSelectedSubDistrictId('');
                          setMapSelectedSectorId('');
                          setMapSelectedNeighborhoodUnitId('');
                          setMapSelectedBlockId('');
                        }}
                        data-testid="button-clear-map-selection"
                      >
                        <X className="h-4 w-4 ml-2" />
                        مسح الاختيار
                      </Button>
                    )}
                  </div>
                  
                  {/* Interactive Map */}
                  <div className="lg:col-span-3">
                    <div className="h-[600px] rounded-lg overflow-hidden border">
                      <InteractiveDrawingMap
                        selectedGovernorateId={mapSelectedGovernorateId}
                        selectedDistrictId={mapSelectedDistrictId}
                        selectedSubDistrictId={mapSelectedSubDistrictId}
                        selectedSectorId={mapSelectedSectorId}
                        selectedNeighborhoodUnitId={mapSelectedNeighborhoodUnitId}
                        selectedBlockId={mapSelectedBlockId}
                        onGovernorateSelect={(govId) => {
                          setMapSelectedGovernorateId(govId);
                          setMapSelectedDistrictId('');
                          setMapSelectedSubDistrictId('');
                          setMapSelectedSectorId('');
                          setMapSelectedNeighborhoodUnitId('');
                          setMapSelectedBlockId('');
                        }}
                        onDistrictSelect={(distId) => {
                          setMapSelectedDistrictId(distId);
                          setMapSelectedSubDistrictId('');
                          setMapSelectedSectorId('');
                          setMapSelectedNeighborhoodUnitId('');
                          setMapSelectedBlockId('');
                        }}
                        onSubDistrictSelect={(subDistId) => {
                          setMapSelectedSubDistrictId(subDistId);
                          setMapSelectedSectorId('');
                          setMapSelectedNeighborhoodUnitId('');
                          setMapSelectedBlockId('');
                        }}
                        onSectorSelect={(sectorId) => {
                          setMapSelectedSectorId(sectorId);
                          setMapSelectedNeighborhoodUnitId('');
                          setMapSelectedBlockId('');
                        }}
                        onNeighborhoodUnitSelect={(unitId) => {
                          setMapSelectedNeighborhoodUnitId(unitId);
                          setMapSelectedBlockId('');
                        }}
                        onBlockSelect={(blockId) => {
                          setMapSelectedBlockId(blockId);
                        }}
                        showDrawingTools={false}
                        showBoundaryControls={true}
                      />
                    </div>
                    
                    {/* Basemap Management Section */}
                    {mapSelectedNeighborhoodUnitId && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          مخطط الوحدة الجوارية
                        </h4>
                        
                        {isLoadingBasemap && (
                          <div className="flex items-center gap-2 text-sm text-gray-600" data-testid="text-basemap-loading">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            جاري تحميل المخطط الأساسي...
                          </div>
                        )}
                        
                        {isBasemapError && (
                          <div className="space-y-2">
                            <div className="text-sm text-red-600 dark:text-red-400" data-testid="text-basemap-error">
                              ❌ خطأ في تحميل المخطط الأساسي
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                // Retry by invalidating query
                                queryClient.invalidateQueries({
                                  queryKey: ['/api/geo-jobs', { 
                                    targetType: 'neighborhoodUnit', 
                                    targetId: mapSelectedNeighborhoodUnitId, 
                                    includeOverlay: true 
                                  }]
                                });
                              }}
                              data-testid="button-retry-basemap"
                            >
                              إعادة المحاولة
                            </Button>
                          </div>
                        )}
                        
                        {!isLoadingBasemap && !isBasemapError && basemapLayer && (
                          <div className="space-y-2">
                            <div className="text-sm text-green-600 dark:text-green-400" data-testid="text-basemap-available">
                              ✅ المخطط الأساسي متوفر
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={isBasemapVisible}
                                onCheckedChange={setIsBasemapVisible}
                                data-testid="switch-basemap-visibility"
                              />
                              <Label className="text-sm">إظهار الطبقة الأساسية</Label>
                            </div>
                          </div>
                        )}
                        
                        {!isLoadingBasemap && !isBasemapError && !basemapLayer && (
                          <div className="space-y-3">
                            <div className="text-sm text-orange-600 dark:text-orange-400" data-testid="text-basemap-not-found">
                              📍 لا توجد بيانات جغرافية أساسية لهذه الوحدة الجوارية
                            </div>
                            <Button 
                              variant="default" 
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                console.log('🔄 Upload button clicked for neighborhood unit:', mapSelectedNeighborhoodUnitId);
                                setShowUploadDialog(true);
                              }}
                              data-testid="button-upload-geotiff"
                            >
                              <Plus className="h-4 w-4 ml-2" />
                              رفع ملف GeoTIFF
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Governorate Dialog */}
      <Dialog open={showEditGovernorate} onOpenChange={setShowEditGovernorate}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المحافظة</DialogTitle>
          </DialogHeader>
          <Form {...governorateForm}>
            <form onSubmit={governorateForm.handleSubmit(onSubmitGovernorate)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={governorateForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رمز المحافظة *</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: YE01" {...field} data-testid="input-edit-governorate-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={governorateForm.control}
                  name="nameAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم العربي *</FormLabel>
                      <FormControl>
                        <Input placeholder="صنعاء" {...field} data-testid="input-edit-governorate-name-ar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={governorateForm.control}
                  name="nameEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الإنجليزي *</FormLabel>
                      <FormControl>
                        <Input placeholder="Sana'a" {...field} data-testid="input-edit-governorate-name-en" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={governorateForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>نشط</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-governorate-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={governorateForm.control}
                name="geometry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البيانات الجغرافية (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='{"type": "Polygon", "coordinates": [...]}'
                        className="h-24"
                        {...field}
                        data-testid="textarea-edit-governorate-geometry"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={governorateForm.control}
                name="properties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>خصائص إضافية (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='{"population": 1000000, "area": 1000}'
                        className="h-20"
                        {...field}
                        data-testid="textarea-edit-governorate-properties"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditGovernorate(false);
                    setSelectedGovernorate(null);
                  }}
                  data-testid="button-cancel-edit-governorate"
                >
                  <X className="h-4 w-4 ml-2" />
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateGovernorateMutation.isPending}
                  data-testid="button-save-edit-governorate"
                >
                  <Save className="h-4 w-4 ml-2" />
                  تحديث
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit District Dialog */}
      <Dialog open={showEditDistrict} onOpenChange={setShowEditDistrict}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المديرية</DialogTitle>
          </DialogHeader>
          <Form {...districtForm}>
            <form onSubmit={districtForm.handleSubmit(onSubmitDistrict)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={districtForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رمز المديرية</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: YE01001" {...field} data-testid="input-edit-district-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={districtForm.control}
                  name="nameAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم العربي *</FormLabel>
                      <FormControl>
                        <Input placeholder="الصافية" {...field} data-testid="input-edit-district-name-ar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={districtForm.control}
                  name="nameEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الإنجليزي</FormLabel>
                      <FormControl>
                        <Input placeholder="As Safiyah" {...field} data-testid="input-edit-district-name-en" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={districtForm.control}
                  name="governorateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المحافظة *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-district-governorate">
                            <SelectValue placeholder="اختر المحافظة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {governorates.map((gov) => (
                            <SelectItem key={gov.id} value={gov.id}>
                              {gov.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={districtForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>نشط</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-district-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={districtForm.control}
                name="geometry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البيانات الجغرافية (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='{"type": "Polygon", "coordinates": [...]}'
                        className="h-24"
                        {...field}
                        data-testid="textarea-edit-district-geometry"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={districtForm.control}
                name="properties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>خصائص إضافية (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='{"population": 50000, "area": 100}'
                        className="h-20"
                        {...field}
                        data-testid="textarea-edit-district-properties"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDistrict(false);
                    setSelectedDistrict(null);
                  }}
                  data-testid="button-cancel-edit-district"
                >
                  <X className="h-4 w-4 ml-2" />
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateDistrictMutation.isPending}
                  data-testid="button-save-edit-district"
                >
                  <Save className="h-4 w-4 ml-2" />
                  تحديث
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* GeoTIFF Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md" dir="rtl" aria-describedby="upload-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              رفع ملف GeoTIFF
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              رفع ملف GeoTIFF للوحدة الجوارية المختارة لإنشاء مخطط أساسي جديد
            </div>

            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="geotiff-file">اختر ملف GeoTIFF</Label>
              <Input
                id="geotiff-file"
                type="file"
                accept=".tif,.tiff,.geotiff"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setSelectedFile(file || null);
                }}
                data-testid="input-geotiff-file"
              />
              <div className="text-xs text-gray-500">
                الملفات المدعومة: .tif, .tiff, .geotiff (الحد الأقصى: 100MB)
              </div>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  📄 {selectedFile.name}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-300">
                  الحجم: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploadGeoTiffMutation.isPending && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-yellow-900 dark:text-yellow-100">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  جاري رفع الملف ومعالجته...
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={uploadGeoTiffMutation.isPending}
              data-testid="button-cancel-upload"
            >
              <X className="h-4 w-4 ml-2" />
              إلغاء
            </Button>
            <Button 
              type="button"
              onClick={() => {
                if (selectedFile && mapSelectedNeighborhoodUnitId) {
                  uploadGeoTiffMutation.mutate({ 
                    file: selectedFile, 
                    targetId: mapSelectedNeighborhoodUnitId 
                  });
                }
              }}
              disabled={!selectedFile || uploadGeoTiffMutation.isPending || !mapSelectedNeighborhoodUnitId}
              data-testid="button-confirm-upload"
            >
              <Plus className="h-4 w-4 ml-2" />
              رفع الملف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}