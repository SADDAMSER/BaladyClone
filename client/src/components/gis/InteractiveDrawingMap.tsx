import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Polyline, Polygon } from 'react-leaflet';
import L, { LatLng, LeafletMouseEvent } from 'leaflet';
import DrawingToolbar, { type DrawingMode } from './DrawingToolbar';
import GeographicBoundaryLayer from './GeographicBoundaryLayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Map as MapIcon, Layers, Shapes } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DrawingFeature {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'rectangle' | 'circle';
  coordinates: any;
  properties?: {
    name?: string;
    description?: string;
    area?: number; // للمضلعات والدوائر
    length?: number; // للخطوط
  };
}

interface DrawingState {
  isDrawing: boolean;
  currentPath: LatLng[];
  tempLayer?: L.Layer;
}

interface InteractiveDrawingMapProps {
  onFeatureDrawn?: (feature: DrawingFeature) => void;
  onFeatureDeleted?: (featureId: string) => void;
  features?: DrawingFeature[];
  height?: string;
  center?: [number, number];
  zoom?: number;
  isEnabled?: boolean;
  // Geographic boundary props
  selectedGovernorateId?: string;
  selectedDistrictId?: string;
  onBoundaryClick?: (type: 'governorate' | 'district', id: string, name: string) => void;
}

type MapType = 'streets' | 'satellite' | 'hybrid' | 'terrain';

const mapLayers = {
  streets: {
    name: 'الخريطة العادية',
    icon: MapIcon,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  satellite: {
    name: 'صور الأقمار الصناعية',
    icon: Globe,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
  },
  hybrid: {
    name: 'الخريطة المختلطة',
    icon: Layers,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
  },
  terrain: {
    name: 'خريطة التضاريس',
    icon: MapIcon,
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap (CC-BY-SA)'
  }
};

interface MapTypeControlProps {
  currentMapType: MapType;
  onMapTypeChange: (type: MapType) => void;
}

function MapTypeControl({ currentMapType, onMapTypeChange }: MapTypeControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[1000]" data-testid="map-type-control">
      <Card className="shadow-lg">
        <CardContent className="p-2">
          {!isOpen ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2"
              data-testid="button-open-map-layers"
            >
              <Layers className="h-4 w-4" />
              <span className="text-sm">طبقات الخريطة</span>
            </Button>
          ) : (
            <div className="space-y-1 min-w-[180px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">نوع الخريطة</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                  data-testid="button-close-map-layers"
                >
                  ×
                </Button>
              </div>
              {Object.entries(mapLayers).map(([key, layer]) => {
                const IconComponent = layer.icon;
                const isActive = currentMapType === key;
                return (
                  <Button
                    key={key}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      onMapTypeChange(key as MapType);
                      setIsOpen(false);
                    }}
                    className={`w-full justify-start text-sm ${
                      isActive ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    data-testid={`button-map-type-${key}`}
                  >
                    <IconComponent className="h-4 w-4 ml-2" />
                    {layer.name}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Drawing interaction component
function DrawingHandler({ 
  currentMode, 
  onFeatureDrawn, 
  isEnabled,
  drawingState,
  setDrawingState
}: { 
  currentMode: DrawingMode;
  onFeatureDrawn: (feature: DrawingFeature) => void;
  isEnabled: boolean;
  drawingState: DrawingState;
  setDrawingState: React.Dispatch<React.SetStateAction<DrawingState>>;
}) {
  const map = useMap();

  // Clear temporary drawing when mode changes
  useEffect(() => {
    if (drawingState.tempLayer) {
      map.removeLayer(drawingState.tempLayer);
    }
    setDrawingState({
      isDrawing: false,
      currentPath: [],
    });
  }, [currentMode, map, drawingState.tempLayer, setDrawingState]);

  const mapEvents = useMapEvents({
    click: (e: LeafletMouseEvent) => {
      if (!isEnabled || currentMode === 'pan') return;

      const { lat, lng } = e.latlng;
      
      switch (currentMode) {
        case 'point':
          // Create point immediately
          onFeatureDrawn({
            id: Date.now().toString(),
            type: 'point',
            coordinates: [lng, lat]
          });
          break;
          
        case 'line':
          handleLineDrawing(e.latlng);
          break;
          
        case 'polygon':
          handlePolygonDrawing(e.latlng);
          break;

        case 'rectangle':
          if (!drawingState.isDrawing) {
            // Start rectangle
            setDrawingState(prev => ({
              ...prev,
              isDrawing: true,
              currentPath: [e.latlng],
            }));
          } else {
            // Complete rectangle
            completeRectangle(drawingState.currentPath[0], e.latlng);
          }
          break;

        case 'circle':
          if (!drawingState.isDrawing) {
            // Start circle
            setDrawingState(prev => ({
              ...prev,
              isDrawing: true,
              currentPath: [e.latlng],
            }));
          } else {
            // Complete circle
            completeCircle(drawingState.currentPath[0], e.latlng);
          }
          break;
      }
    },
    
    dblclick: (e: LeafletMouseEvent) => {
      if (!isEnabled || currentMode === 'pan') return;
      
      if (currentMode === 'line' || currentMode === 'polygon') {
        completeDrawing();
      }
    },

    mousemove: (e: LeafletMouseEvent) => {
      if (!isEnabled || !drawingState.isDrawing) return;
      
      updateTempDrawing(e.latlng);
    },

    keydown: (e: any) => {
      if (e.originalEvent.key === 'Escape') {
        cancelDrawing();
      }
    }
  });

  const handleLineDrawing = (latlng: LatLng) => {
    const newPath = [...drawingState.currentPath, latlng];
    
    setDrawingState(prev => ({
      ...prev,
      isDrawing: true,
      currentPath: newPath,
    }));

    // Create/update temporary line
    updateTempLine(newPath);
  };

  const handlePolygonDrawing = (latlng: LatLng) => {
    const newPath = [...drawingState.currentPath, latlng];
    
    setDrawingState(prev => ({
      ...prev,
      isDrawing: true,
      currentPath: newPath,
    }));

    // Create/update temporary polygon
    updateTempPolygon(newPath);
  };

  const updateTempLine = (path: LatLng[]) => {
    if (drawingState.tempLayer) {
      map.removeLayer(drawingState.tempLayer);
    }

    if (path.length > 1) {
      const tempLine = L.polyline(path, { 
        color: '#3388ff', 
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 5'
      });
      map.addLayer(tempLine);
      
      setDrawingState(prev => ({
        ...prev,
        tempLayer: tempLine,
      }));
    }
  };

  const updateTempPolygon = (path: LatLng[]) => {
    if (drawingState.tempLayer) {
      map.removeLayer(drawingState.tempLayer);
    }

    if (path.length > 2) {
      const tempPolygon = L.polygon(path, { 
        color: '#3388ff', 
        weight: 3,
        opacity: 0.7,
        fillOpacity: 0.2,
        dashArray: '5, 5'
      });
      map.addLayer(tempPolygon);
      
      setDrawingState(prev => ({
        ...prev,
        tempLayer: tempPolygon,
      }));
    }
  };

  const updateTempDrawing = (latlng: LatLng) => {
    if (!drawingState.isDrawing || drawingState.currentPath.length === 0) return;

    const startPoint = drawingState.currentPath[0];
    
    if (currentMode === 'rectangle') {
      updateTempRectangle(startPoint, latlng);
    } else if (currentMode === 'circle') {
      updateTempCircle(startPoint, latlng);
    }
  };

  const updateTempRectangle = (start: LatLng, end: LatLng) => {
    if (drawingState.tempLayer) {
      map.removeLayer(drawingState.tempLayer);
    }

    const bounds = L.latLngBounds([start, end]);
    const tempRect = L.rectangle(bounds, { 
      color: '#3388ff', 
      weight: 3,
      opacity: 0.7,
      fillOpacity: 0.2,
      dashArray: '5, 5'
    });
    map.addLayer(tempRect);
    
    setDrawingState(prev => ({
      ...prev,
      tempLayer: tempRect,
    }));
  };

  const updateTempCircle = (center: LatLng, edge: LatLng) => {
    if (drawingState.tempLayer) {
      map.removeLayer(drawingState.tempLayer);
    }

    const radius = center.distanceTo(edge);
    const tempCircle = L.circle(center, { 
      radius,
      color: '#3388ff', 
      weight: 3,
      opacity: 0.7,
      fillOpacity: 0.2,
      dashArray: '5, 5'
    });
    map.addLayer(tempCircle);
    
    setDrawingState(prev => ({
      ...prev,
      tempLayer: tempCircle,
    }));
  };

  const completeDrawing = () => {
    if (drawingState.currentPath.length < 2) return;

    if (currentMode === 'line' && drawingState.currentPath.length >= 2) {
      const coordinates = drawingState.currentPath.map(p => [p.lng, p.lat]);
      const distance = calculateDistance(drawingState.currentPath);
      
      onFeatureDrawn({
        id: Date.now().toString(),
        type: 'line',
        coordinates,
        properties: {
          length: distance
        }
      });
    } else if (currentMode === 'polygon' && drawingState.currentPath.length >= 3) {
      // Close the polygon
      const closedPath = [...drawingState.currentPath, drawingState.currentPath[0]];
      const coordinates = closedPath.map(p => [p.lng, p.lat]);
      const area = calculateArea(closedPath);
      
      onFeatureDrawn({
        id: Date.now().toString(),
        type: 'polygon',
        coordinates,
        properties: {
          area
        }
      });
    }

    // Clean up
    if (drawingState.tempLayer) {
      map.removeLayer(drawingState.tempLayer);
    }
    
    setDrawingState({
      isDrawing: false,
      currentPath: [],
    });
  };

  const completeRectangle = (start: LatLng, end: LatLng) => {
    const bounds = L.latLngBounds([start, end]);
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    // Create rectangle coordinates (clockwise)
    const coordinates = [
      [sw.lng, sw.lat], // SW
      [ne.lng, sw.lat], // SE
      [ne.lng, ne.lat], // NE
      [sw.lng, ne.lat], // NW
      [sw.lng, sw.lat], // Close
    ];

    const area = calculateRectangleArea(sw, ne);

    onFeatureDrawn({
      id: Date.now().toString(),
      type: 'rectangle',
      coordinates,
      properties: {
        area
      }
    });

    // Clean up
    if (drawingState.tempLayer) {
      map.removeLayer(drawingState.tempLayer);
    }
    
    setDrawingState({
      isDrawing: false,
      currentPath: [],
    });
  };

  const completeCircle = (center: LatLng, edge: LatLng) => {
    const radius = center.distanceTo(edge);
    
    // Convert circle to polygon (approximation)
    const points = 32;
    const coordinates = [];
    
    for (let i = 0; i <= points; i++) {
      const angle = (i * 2 * Math.PI) / points;
      const lat = center.lat + (radius / 111111) * Math.cos(angle); // Rough conversion
      const lng = center.lng + (radius / (111111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
      coordinates.push([lng, lat]);
    }

    const area = Math.PI * radius * radius; // Area in square meters

    onFeatureDrawn({
      id: Date.now().toString(),
      type: 'circle',
      coordinates,
      properties: {
        area
      }
    });

    // Clean up
    if (drawingState.tempLayer) {
      map.removeLayer(drawingState.tempLayer);
    }
    
    setDrawingState({
      isDrawing: false,
      currentPath: [],
    });
  };

  const cancelDrawing = () => {
    if (drawingState.tempLayer) {
      map.removeLayer(drawingState.tempLayer);
    }
    
    setDrawingState({
      isDrawing: false,
      currentPath: [],
    });
  };

  // Helper functions for calculations
  const calculateDistance = (path: LatLng[]): number => {
    let distance = 0;
    for (let i = 1; i < path.length; i++) {
      distance += path[i-1].distanceTo(path[i]);
    }
    return Math.round(distance); // meters
  };

  const calculateArea = (path: LatLng[]): number => {
    // Simple area calculation using shoelace formula (approximate)
    let area = 0;
    const n = path.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += path[i].lng * path[j].lat;
      area -= path[j].lng * path[i].lat;
    }
    
    area = Math.abs(area) / 2;
    // Convert to square meters (rough approximation)
    return Math.round(area * 111111 * 111111);
  };

  const calculateRectangleArea = (sw: LatLng, ne: LatLng): number => {
    const width = sw.distanceTo(L.latLng(sw.lat, ne.lng));
    const height = sw.distanceTo(L.latLng(ne.lat, sw.lng));
    return Math.round(width * height); // square meters
  };

  return null;
}

// Feature rendering components
function FeatureRenderer({ features }: { features: DrawingFeature[] }) {
  return (
    <>
      {features.map((feature) => {
        switch (feature.type) {
          case 'point':
            return (
              <Marker 
                key={feature.id} 
                position={[feature.coordinates[1], feature.coordinates[0]]}
              />
            );
          case 'line':
            return (
              <Polyline 
                key={feature.id}
                positions={feature.coordinates.map((coord: number[]) => [coord[1], coord[0]])}
                pathOptions={{ color: '#28a745', weight: 3 }}
              />
            );
          case 'polygon':
          case 'rectangle':
          case 'circle':
            return (
              <Polygon
                key={feature.id}
                positions={feature.coordinates.map((coord: number[]) => [coord[1], coord[0]])}
                pathOptions={{ color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.3 }}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}

export default function InteractiveDrawingMap({
  onFeatureDrawn,
  onFeatureDeleted,
  features = [],
  height = '500px',
  center = [15.3694, 44.1910], // Yemen center
  zoom = 7,
  isEnabled = true,
  selectedGovernorateId,
  selectedDistrictId,
  onBoundaryClick
}: InteractiveDrawingMapProps) {
  const [currentMode, setCurrentMode] = useState<DrawingMode>('pan');
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPath: [],
  });
  const [mapType, setMapType] = useState<MapType>(() => {
    const saved = localStorage.getItem('preferred-map-type');
    return (saved as MapType) || 'streets';
  });

  // حفظ نوع الخريطة المفضل
  useEffect(() => {
    localStorage.setItem('preferred-map-type', mapType);
  }, [mapType]);

  const handleFeatureDrawn = (feature: DrawingFeature) => {
    if (onFeatureDrawn) {
      onFeatureDrawn(feature);
    }
    console.log('🎯 رُسم معلم جديد:', feature);
  };

  const handleClear = () => {
    // يمكن تنفيذ وظيفة المسح هنا
    console.log('🗑️ مسح جميع الرسومات');
  };

  const handleExport = () => {
    // تصدير البيانات كـ GeoJSON
    const geoJson = {
      type: 'FeatureCollection',
      features: features.map(f => ({
        type: 'Feature',
        geometry: {
          type: f.type === 'point' ? 'Point' : f.type === 'line' ? 'LineString' : 'Polygon',
          coordinates: f.type === 'polygon' || f.type === 'rectangle' || f.type === 'circle' ? [f.coordinates] : f.coordinates
        },
        properties: f.properties || {}
      }))
    };
    
    const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `map-features-${new Date().toISOString().split('T')[0]}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📤 تصدير البيانات:', geoJson);
  };

  return (
    <div className="space-y-4" data-testid="interactive-drawing-map">
      {/* شريط أدوات الرسم */}
      <DrawingToolbar
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        onClear={handleClear}
        onExport={handleExport}
        isEnabled={isEnabled}
      />
      
      {/* الخريطة */}
      <div className="relative w-full border rounded-lg overflow-hidden shadow-sm" style={{ height }}>
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-full w-full"
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            key={mapType}
            url={mapLayers[mapType].url}
            attribution={mapLayers[mapType].attribution}
          />
          
          {/* طبقة إضافية للخريطة المختلطة */}
          {mapType === 'hybrid' && (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
              opacity={0.3}
            />
          )}
          
          {/* Drawing Handler */}
          <DrawingHandler
            currentMode={currentMode}
            onFeatureDrawn={handleFeatureDrawn}
            isEnabled={isEnabled}
            drawingState={drawingState}
            setDrawingState={setDrawingState}
          />
          
          {/* Geographic Boundaries */}
          <GeographicBoundaryLayer
            selectedGovernorateId={selectedGovernorateId}
            selectedDistrictId={selectedDistrictId}
            onBoundaryClick={onBoundaryClick}
          />
          
          {/* Existing Features */}
          <FeatureRenderer features={features} />
        </MapContainer>
        
        {/* تحكم في نوع الخريطة */}
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-2">
            <div className="flex flex-col gap-2">
              {Object.entries(mapLayers).map(([key, layer]) => {
                const IconComponent = layer.icon;
                const isActive = mapType === key;
                return (
                  <button
                    key={key}
                    onClick={() => setMapType(key as MapType)}
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-green-600 text-white shadow-lg' 
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-300'
                      }
                    `}
                    title={layer.name}
                    data-testid={`map-type-${key}`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* معلومات نوع الخريطة الحالي */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm text-gray-700 z-[1000] shadow-sm border border-gray-200/50" dir="rtl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-medium">{mapLayers[mapType].name}</span>
          </div>
        </div>
      </div>
      
      {/* معلومات الميزات */}
      {features.length > 0 && (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-4" dir="rtl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shapes className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  الميزات المرسومة: <span className="text-blue-600">{features.length}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {features.some(f => f.properties?.area) && (
                    <span className="mr-4">
                      المساحة الإجمالية: {Math.round(features.reduce((sum, f) => sum + (f.properties?.area || 0), 0) / 1000000).toLocaleString()} كم²
                    </span>
                  )}
                  {features.some(f => f.properties?.length) && (
                    <span className="mr-4">
                      الطول الإجمالي: {Math.round(features.reduce((sum, f) => sum + (f.properties?.length || 0), 0) / 1000).toLocaleString()} كم
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors">
                حفظ
              </button>
              <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                تصدير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}