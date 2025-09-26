import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  FileText, 
  Map as MapIcon, 
  Image, 
  Check, 
  X, 
  Clock, 
  AlertTriangle,
  Layers,
  Eye,
  EyeOff,
  Download,
  RefreshCw
} from 'lucide-react';
import InteractiveDrawingMap from '@/components/gis/InteractiveDrawingMap';
import MeasurementPanel, { GeometryMeasurement } from '@/components/gis/MeasurementPanel';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TechnicalReviewCase {
  id: string;
  applicationId: string;
  reviewType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  createdAt: string;
  artifacts?: ReviewArtifact[];
  rasterProducts?: RasterProduct[];
  processingJobs?: IngestionJob[];
  application?: {
    id: string;
    applicantName: string;
    projectName: string;
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface ReviewArtifact {
  id: string;
  artifactType: 'mobile_survey' | 'csv_data' | 'shapefile_data' | 'raster_data';
  geometry: any;
  properties: any;
  sourceInfo: any;
  isValid: boolean;
}

interface RasterProduct {
  id: string;
  productName: string;
  status: 'processing' | 'ready' | 'error';
  imageUrl?: string;
  bounds?: number[];
  width?: number;
  height?: number;
}

interface IngestionJob {
  id: string;
  jobType: string;
  status: string;
  progress: number;
  geoJobId?: string;
}

interface GeoJob {
  id: string;
  status: 'pending' | 'claimed' | 'processing' | 'completed' | 'failed';
  progress: number;
  taskType: string;
  estimatedCompletion?: string;
}

interface LayerData {
  id: string;
  name: string;
  type: 'vector' | 'raster';
  visible: boolean;
  data: any;
  color?: string;
}

interface TechnicalReviewWizardProps {
  reviewCaseId: string;
  onComplete?: (decision: 'approved' | 'rejected', notes: string) => void;
  onClose?: () => void;
}

export default function TechnicalReviewWizard({
  reviewCaseId,
  onComplete,
  onClose
}: TechnicalReviewWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'data' | 'map' | 'review'>('data');
  const [layers, setLayers] = useState<LayerData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([15.3694, 44.1910]);
  const [mapZoom, setMapZoom] = useState(12);
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Review decision state
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Get review case details
  const { data: reviewCase, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/applications', reviewCaseId, 'technical-review'],
    enabled: !!reviewCaseId,
    refetchInterval: (data: any) => {
      // Refresh more frequently if there are processing jobs
      const reviewData = data as TechnicalReviewCase | undefined;
      const hasProcessingJobs = reviewData?.processingJobs?.some((job: IngestionJob) => 
        job.status === 'running' || job.status === 'queued'
      );
      return hasProcessingJobs ? 5000 : 30000; // 5s if processing, 30s otherwise
    }
  });

  // Upload mutations for different data types
  const csvUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await fetch(`/api/technical-review/${reviewCaseId}/upload-csv`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "تم رفع ملف CSV بنجاح", description: "جاري معالجة البيانات..." });
      queryClient.invalidateQueries({ queryKey: ['/api/applications', reviewCaseId, 'technical-review'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ في رفع ملف CSV", 
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    }
  });

  const shapefileUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('shapefileArchive', file);
      
      const response = await fetch(`/api/technical-review/${reviewCaseId}/upload-shapefile`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "تم رفع ملف Shapefile بنجاح", description: "جاري معالجة البيانات..." });
      queryClient.invalidateQueries({ queryKey: ['/api/applications', reviewCaseId, 'technical-review'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ في رفع ملف Shapefile", 
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    }
  });

  const geotiffUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('geotiffFile', file);
      
      const response = await fetch(`/api/technical-review/${reviewCaseId}/upload-geotiff`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "تم رفع ملف GeoTIFF بنجاح", description: "جاري معالجة الصورة الجغرافية..." });
      queryClient.invalidateQueries({ queryKey: ['/api/applications', reviewCaseId, 'technical-review'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ في رفع ملف GeoTIFF", 
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    }
  });

  // Initialize layers from review case data
  useEffect(() => {
    if (!reviewCase) return;

    const newLayers: LayerData[] = [];
    const caseData = reviewCase as TechnicalReviewCase;
    const artifacts = caseData.artifacts || [];
    const rasterProducts = caseData.rasterProducts || [];

    // Add mobile survey data layer
    if (artifacts.some((a: ReviewArtifact) => a.artifactType === 'mobile_survey')) {
      newLayers.push({
        id: 'mobile-survey',
        name: 'بيانات المسح الميداني',
        type: 'vector',
        visible: true,
        data: artifacts.filter((a: ReviewArtifact) => a.artifactType === 'mobile_survey'),
        color: '#10b981'
      });
    }

    // Add CSV data layer
    if (artifacts.some((a: ReviewArtifact) => a.artifactType === 'csv_data')) {
      newLayers.push({
        id: 'csv-data',
        name: 'بيانات CSV',
        type: 'vector',
        visible: true,
        data: artifacts.filter((a: ReviewArtifact) => a.artifactType === 'csv_data'),
        color: '#3b82f6'
      });
    }

    // Add shapefile data layer
    if (artifacts.some((a: ReviewArtifact) => a.artifactType === 'shapefile_data')) {
      newLayers.push({
        id: 'shapefile-data',
        name: 'بيانات Shapefile',
        type: 'vector',
        visible: true,
        data: artifacts.filter((a: ReviewArtifact) => a.artifactType === 'shapefile_data'),
        color: '#f59e0b'
      });
    }

    // Add raster layers
    if (rasterProducts.length > 0) {
      rasterProducts.forEach((raster: RasterProduct, index: number) => {
        if (raster.status === 'ready' && raster.imageUrl) {
          newLayers.push({
            id: `raster-${raster.id}`,
            name: raster.productName,
            type: 'raster',
            visible: true,
            data: raster
          });
        }
      });
    }

    setLayers(newLayers);

    // Set map center based on application location
    if (caseData?.application?.location) {
      setMapCenter([caseData.application.location.lat, caseData.application.location.lng]);
      setMapZoom(16);
    }
  }, [reviewCase]);

  const handleFileUpload = useCallback(async (file: File, type: 'csv' | 'shapefile' | 'geotiff') => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      let result;
      switch (type) {
        case 'csv':
          result = await csvUploadMutation.mutateAsync(file);
          break;
        case 'shapefile':
          result = await shapefileUploadMutation.mutateAsync(file);
          break;
        case 'geotiff':
          result = await geotiffUploadMutation.mutateAsync(file);
          break;
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Move to map tab after successful upload
      setTimeout(() => {
        setActiveTab('map');
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);

    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [csvUploadMutation, shapefileUploadMutation, geotiffUploadMutation, reviewCaseId]);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ));
  }, []);

  const handleReviewSubmit = useCallback(() => {
    if (!reviewDecision) {
      toast({
        title: "يرجى اتخاذ قرار",
        description: "يجب اختيار الموافقة أو الرفض قبل إرسال المراجعة",
        variant: "destructive"
      });
      return;
    }

    if (onComplete) {
      onComplete(reviewDecision, reviewNotes);
    }
  }, [reviewDecision, reviewNotes, onComplete]);

  if (isLoading) {
    return (
      <Card className="w-full h-96 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>جاري تحميل بيانات المراجعة...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <span>خطأ في تحميل بيانات المراجعة</span>
          </div>
          <Button onClick={() => refetch()} className="mt-4">
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" data-testid="technical-review-wizard">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">المراجعة الفنية</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {(reviewCase as TechnicalReviewCase)?.application?.projectName || 'غير محدد'} - {(reviewCase as TechnicalReviewCase)?.application?.applicantName || 'غير محدد'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={(reviewCase as TechnicalReviewCase)?.status === 'completed' ? 'default' : 'secondary'}>
                {(reviewCase as TechnicalReviewCase)?.status === 'pending' ? 'معلق' : 
                 (reviewCase as TechnicalReviewCase)?.status === 'in_progress' ? 'قيد المراجعة' :
                 (reviewCase as TechnicalReviewCase)?.status === 'completed' ? 'مكتمل' : 'مرفوض'}
              </Badge>
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  إغلاق
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="data" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>البيانات</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center space-x-2">
              <MapIcon className="h-4 w-4" />
              <span>الخريطة</span>
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center space-x-2">
              <Check className="h-4 w-4" />
              <span>القرار</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 overflow-hidden">
            <TabsContent value="data" className="h-full m-0">
              <DataIngestionPanel
                reviewCase={reviewCase as TechnicalReviewCase}
                onFileUpload={handleFileUpload}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />
            </TabsContent>

            <TabsContent value="map" className="h-full m-0">
              <MapReviewPanel
                layers={layers}
                onToggleLayer={toggleLayerVisibility}
                center={mapCenter}
                zoom={mapZoom}
                reviewCase={reviewCase as TechnicalReviewCase}
              />
            </TabsContent>

            <TabsContent value="review" className="h-full m-0">
              <ReviewDecisionPanel
                reviewCase={reviewCase as TechnicalReviewCase}
                decision={reviewDecision}
                notes={reviewNotes}
                onDecisionChange={setReviewDecision}
                onNotesChange={setReviewNotes}
                onSubmit={handleReviewSubmit}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// Data Ingestion Panel Component
function DataIngestionPanel({
  reviewCase,
  onFileUpload,
  isUploading,
  uploadProgress
}: {
  reviewCase: TechnicalReviewCase;
  onFileUpload: (file: File, type: 'csv' | 'shapefile' | 'geotiff') => void;
  isUploading: boolean;
  uploadProgress: number;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'csv' | 'shapefile' | 'geotiff'>('csv');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'shapefile' | 'geotiff') => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file, type);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Upload Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">رفع البيانات</h3>
        
        {/* Mobile Survey Sync */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">مزامنة المسح الميداني</h4>
                  <p className="text-sm text-muted-foreground">البيانات المسحية من التطبيق المحمول</p>
                </div>
              </div>
              <Badge variant={(reviewCase.artifacts || []).some(a => a.artifactType === 'mobile_survey') ? 'default' : 'secondary'}>
                {(reviewCase.artifacts || []).some(a => a.artifactType === 'mobile_survey') ? 'متوفر' : 'غير متوفر'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* CSV Upload */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">ملف CSV</h4>
                  <p className="text-sm text-muted-foreground">بيانات جدولية مع إحداثيات</p>
                </div>
              </div>
              <Badge variant={(reviewCase.artifacts || []).some(a => a.artifactType === 'csv_data') ? 'default' : 'secondary'}>
                {(reviewCase.artifacts || []).some(a => a.artifactType === 'csv_data') ? 'متوفر' : 'غير متوفر'}
              </Badge>
            </div>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileSelect(e, 'csv')}
              disabled={isUploading}
              className="text-sm"
              data-testid="input-csv-upload"
            />
          </CardContent>
        </Card>

        {/* Shapefile Upload */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Layers className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium">ملف Shapefile</h4>
                  <p className="text-sm text-muted-foreground">ملف ZIP يحتوي على shapefile</p>
                </div>
              </div>
              <Badge variant={(reviewCase.artifacts || []).some(a => a.artifactType === 'shapefile_data') ? 'default' : 'secondary'}>
                {(reviewCase.artifacts || []).some(a => a.artifactType === 'shapefile_data') ? 'متوفر' : 'غير متوفر'}
              </Badge>
            </div>
            <Input
              type="file"
              accept=".zip,.shp"
              onChange={(e) => handleFileSelect(e, 'shapefile')}
              disabled={isUploading}
              className="text-sm"
              data-testid="input-shapefile-upload"
            />
          </CardContent>
        </Card>

        {/* GeoTIFF Upload */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Image className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">صورة GeoTIFF</h4>
                  <p className="text-sm text-muted-foreground">صورة جغرافية مرجعة</p>
                </div>
              </div>
              <Badge variant={(reviewCase.rasterProducts || []).some(r => r.status === 'ready') ? 'default' : 'secondary'}>
                {(reviewCase.rasterProducts || []).some(r => r.status === 'ready') ? 'متوفر' : 'غير متوفر'}
              </Badge>
            </div>
            <Input
              type="file"
              accept=".tif,.tiff,.geotiff"
              onChange={(e) => handleFileSelect(e, 'geotiff')}
              disabled={isUploading}
              className="text-sm"
              data-testid="input-geotiff-upload"
            />
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {isUploading && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">جاري الرفع...</span>
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Processing Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">حالة المعالجة</h3>
        
        {(reviewCase.processingJobs || []).map((job: IngestionJob) => (
          <Card key={job.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{job.jobType}</span>
                <Badge variant={
                  job.status === 'completed' ? 'default' :
                  job.status === 'running' ? 'secondary' :
                  job.status === 'failed' ? 'destructive' : 'outline'
                }>
                  {job.status === 'completed' ? 'مكتمل' :
                   job.status === 'running' ? 'قيد التنفيذ' :
                   job.status === 'failed' ? 'فشل' : 'معلق'}
                </Badge>
              </div>
              <Progress value={job.progress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">
                {job.progress}% مكتمل
              </p>
            </CardContent>
          </Card>
        ))}

        {(!(reviewCase.processingJobs) || (reviewCase.processingJobs || []).length === 0) && (
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">لا توجد مهام معالجة جارية</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Map Review Panel Component
function MapReviewPanel({
  layers,
  onToggleLayer,
  center,
  zoom,
  reviewCase
}: {
  layers: LayerData[];
  onToggleLayer: (layerId: string) => void;
  center: [number, number];
  zoom: number;
  reviewCase: TechnicalReviewCase;
}) {
  const [drawnFeatures, setDrawnFeatures] = useState<any[]>([]);
  const [selectedGeometry, setSelectedGeometry] = useState<string>();

  const handleFeatureDrawn = useCallback((feature: any) => {
    setDrawnFeatures(prev => [...prev, feature]);
  }, []);

  const handleFeatureDeleted = useCallback((featureId: string) => {
    setDrawnFeatures(prev => prev.filter(f => f.id !== featureId));
  }, []);

  // Convert drawn features and layer data to GeometryMeasurement format
  const geometryMeasurements = useMemo(() => {
    const measurements: GeometryMeasurement[] = [];
    
    // Add drawn features
    drawnFeatures.forEach((feature, index) => {
      measurements.push({
        id: feature.id || `drawn-${index}`,
        type: feature.type,
        name: `${getGeometryTypeArabic(feature.type)} مرسوم ${index + 1}`,
        coordinates: feature.coordinates
      });
    });
    
    // Add layer geometries (from uploaded data)
    layers.forEach(layer => {
      if (layer.data && Array.isArray(layer.data)) {
        layer.data.forEach((item: any, index: number) => {
          if (item.geometry && item.geometry.coordinates) {
            measurements.push({
              id: `${layer.id}-${index}`,
              type: getGeometryTypeFromGeoJSON(item.geometry.type),
              name: `${layer.name} - عنصر ${index + 1}`,
              coordinates: item.geometry.coordinates
            });
          }
        });
      }
    });
    
    return measurements;
  }, [drawnFeatures, layers]);

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar with Layer Controls and Measurements */}
      <div className="w-96 space-y-4 overflow-y-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">طبقات الخريطة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {layers.map((layer) => (
              <div key={layer.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded border-2"
                    style={{ 
                      backgroundColor: layer.visible ? (layer.color || '#3b82f6') : 'transparent',
                      borderColor: layer.color || '#3b82f6'
                    }}
                  />
                  <span className="text-sm font-medium">{layer.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleLayer(layer.id)}
                  data-testid={`button-toggle-layer-${layer.id}`}
                >
                  {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
            ))}
            
            {layers.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد طبقات متاحة</p>
                <p className="text-xs">قم برفع البيانات أولاً</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Measurement Panel */}
        <MeasurementPanel
          geometries={geometryMeasurements}
          selectedGeometry={selectedGeometry}
          onGeometrySelect={setSelectedGeometry}
          showCoordinates={true}
        />
        
        {/* Drawing Tools Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">أدوات الرسم</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              استخدم أدوات الرسم لإضافة ملاحظات وقياسات على الخريطة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <div className="flex-1">
        <InteractiveDrawingMap
          height="100%"
          center={center}
          zoom={zoom}
          features={drawnFeatures}
          onFeatureDrawn={handleFeatureDrawn}
          onFeatureDeleted={handleFeatureDeleted}
          isEnabled={true}
          showDrawingTools={true}
          showBoundaryControls={false}
        />
      </div>
    </div>
  );
}

// Helper functions for geometry type conversion
function getGeometryTypeArabic(type: string): string {
  switch (type) {
    case 'point': return 'نقطة';
    case 'line': return 'خط';
    case 'polygon': return 'مضلع';
    case 'rectangle': return 'مستطيل';
    case 'circle': return 'دائرة';
    default: return 'شكل';
  }
}

function getGeometryTypeFromGeoJSON(geoJsonType: string): 'point' | 'line' | 'polygon' | 'rectangle' | 'circle' {
  switch (geoJsonType.toLowerCase()) {
    case 'point': return 'point';
    case 'linestring': return 'line';
    case 'polygon': return 'polygon';
    case 'multipoint': return 'point';
    case 'multilinestring': return 'line';
    case 'multipolygon': return 'polygon';
    default: return 'polygon';
  }
}

// Review Decision Panel Component
function ReviewDecisionPanel({
  reviewCase,
  decision,
  notes,
  onDecisionChange,
  onNotesChange,
  onSubmit
}: {
  reviewCase: TechnicalReviewCase;
  decision: 'approved' | 'rejected' | null;
  notes: string;
  onDecisionChange: (decision: 'approved' | 'rejected' | null) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ملخص المراجعة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">عدد العناصر المستوردة</Label>
              <p className="text-2xl font-bold">{(reviewCase.artifacts || []).length}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">المنتجات النقطية</Label>
              <p className="text-2xl font-bold">{(reviewCase.rasterProducts || []).length}</p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">تفاصيل البيانات</Label>
            <div className="mt-2 space-y-2">
              {(reviewCase.artifacts || []).map((artifact: ReviewArtifact, index: number) => (
                <div key={artifact.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">
                    {artifact.artifactType === 'mobile_survey' ? 'مسح ميداني' :
                     artifact.artifactType === 'csv_data' ? 'بيانات CSV' :
                     artifact.artifactType === 'shapefile_data' ? 'بيانات Shapefile' : 'بيانات نقطية'}
                  </span>
                  <Badge variant={artifact.isValid ? 'default' : 'destructive'}>
                    {artifact.isValid ? 'صحيح' : 'خطأ'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>قرار المراجعة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium">اتخاذ القرار</Label>
            <div className="flex gap-4 mt-2">
              <Button
                variant={decision === 'approved' ? 'default' : 'outline'}
                onClick={() => onDecisionChange('approved')}
                className="flex items-center space-x-2"
                data-testid="button-approve-review"
              >
                <Check className="h-4 w-4" />
                <span>الموافقة</span>
              </Button>
              <Button
                variant={decision === 'rejected' ? 'destructive' : 'outline'}
                onClick={() => onDecisionChange('rejected')}
                className="flex items-center space-x-2"
                data-testid="button-reject-review"
              >
                <X className="h-4 w-4" />
                <span>الرفض</span>
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="review-notes" className="text-base font-medium">
              ملاحظات المراجعة
            </Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="أدخل ملاحظاتك حول المراجعة الفنية..."
              className="mt-2 min-h-32"
              data-testid="textarea-review-notes"
            />
          </div>

          <Button
            onClick={onSubmit}
            disabled={!decision}
            className="w-full"
            size="lg"
            data-testid="button-submit-review"
          >
            إرسال قرار المراجعة
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}