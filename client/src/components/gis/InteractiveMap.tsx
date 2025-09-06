import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Map as MapIcon, Layers } from 'lucide-react';

// إصلاح أيقونات Leaflet الافتراضية
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveMapProps {
  onLocationSelect?: (coordinates: { lat: number; lng: number }) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  enableDrawing?: boolean;
  onFeatureDrawn?: (feature: any) => void;
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

interface CoordinateDisplayProps {
  coordinates: { lat: number; lng: number } | null;
  format: 'wgs84' | 'utm';
  onFormatChange: (format: 'wgs84' | 'utm') => void;
}

function CoordinateDisplay({ coordinates, format, onFormatChange }: CoordinateDisplayProps) {
  // تحويل للإحداثيات UTM (مبسط للمنطقة 38N)
  const toUTM = (lat: number, lng: number) => {
    // تحويل تقريبي للمنطقة 38N في اليمن
    const x = ((lng - 45) * 111320 * Math.cos(lat * Math.PI / 180)) + 500000;
    const y = (lat * 111320) + 10000000;
    return { x: Math.round(x), y: Math.round(y) };
  };

  return (
    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-md shadow-md z-[1000] border" dir="ltr">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => onFormatChange(format === 'wgs84' ? 'utm' : 'wgs84')}
          className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded"
          title="تبديل نظام الإحداثيات"
          data-testid="button-toggle-coordinate-format"
        >
          {format === 'wgs84' ? 'WGS84' : 'UTM 38N'}
        </button>
      </div>
      <div className="text-sm font-mono" data-testid="coordinate-display">
        {coordinates ? (
          format === 'wgs84' ? (
            <>
              <div>خط العرض: {coordinates.lat.toFixed(6)}</div>
              <div>خط الطول: {coordinates.lng.toFixed(6)}</div>
            </>
          ) : (
            (() => {
              const utm = toUTM(coordinates.lat, coordinates.lng);
              return (
                <>
                  <div>X (شرق): {utm.x.toLocaleString()}</div>
                  <div>Y (شمال): {utm.y.toLocaleString()}</div>
                </>
              );
            })()
          )
        ) : (
          <div>حرك الماوس فوق الخريطة</div>
        )}
      </div>
    </div>
  );
}

function MapEvents({ 
  onCoordinatesChange, 
  onLocationSelect 
}: { 
  onCoordinatesChange: (coords: { lat: number; lng: number }) => void;
  onLocationSelect?: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    mousemove: (e) => {
      onCoordinatesChange({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    },
    mouseout: () => {
      onCoordinatesChange({ lat: 0, lng: 0 });
    },
    click: (e) => {
      if (onLocationSelect) {
        onLocationSelect({
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
      }
    }
  });

  return null;
}

// مكون لحفظ واستعادة حالة الخريطة
function MapStateManager() {
  const map = useMap();
  
  useEffect(() => {
    // استعادة الحالة المحفوظة
    const savedView = localStorage.getItem('map-view');
    if (savedView) {
      try {
        const { center, zoom } = JSON.parse(savedView);
        map.setView([center.lat, center.lng], zoom);
      } catch (e) {
        console.log('⚠️ خطأ في استعادة حالة الخريطة');
      }
    }
    
    // حفظ الحالة عند التحرك
    const handleMoveEnd = () => {
      const state = {
        center: map.getCenter(),
        zoom: map.getZoom()
      };
      localStorage.setItem('map-view', JSON.stringify(state));
    };
    
    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map]);

  return null;
}

export default function InteractiveMap({
  onLocationSelect,
  center = [15.3694, 44.1910], // مركز اليمن
  zoom = 7,
  height = '400px',
  enableDrawing = false,
  onFeatureDrawn
}: InteractiveMapProps) {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [coordinateFormat, setCoordinateFormat] = useState<'wgs84' | 'utm'>('wgs84');
  const [mapType, setMapType] = useState<MapType>(() => {
    const saved = localStorage.getItem('preferred-map-type');
    return (saved as MapType) || 'streets';
  });
  const mapRef = useRef<L.Map | null>(null);

  // حفظ نوع الخريطة المفضل
  useEffect(() => {
    localStorage.setItem('preferred-map-type', mapType);
  }, [mapType]);

  return (
    <div className="relative w-full" style={{ height }} data-testid="interactive-map">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={true}
        attributionControl={false}
        ref={mapRef}
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
        
        {/* معالج الأحداث */}
        <MapEvents
          onCoordinatesChange={setCoordinates}
          onLocationSelect={onLocationSelect}
        />
        
        {/* إدارة حالة الخريطة */}
        <MapStateManager />
      </MapContainer>
      
      {/* تحكم في نوع الخريطة */}
      <MapTypeControl
        currentMapType={mapType}
        onMapTypeChange={setMapType}
      />
      
      {/* عرض الإحداثيات */}
      <CoordinateDisplay
        coordinates={coordinates}
        format={coordinateFormat}
        onFormatChange={setCoordinateFormat}
      />
      
      {/* معلومات نوع الخريطة الحالي */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground z-[1000]" dir="rtl">
        {mapLayers[mapType].name}
      </div>
    </div>
  );
}