import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const mapRef = useRef<L.Map | null>(null);

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
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        
        {/* معالج الأحداث */}
        <MapEvents
          onCoordinatesChange={setCoordinates}
          onLocationSelect={onLocationSelect}
        />
        
        {/* إدارة حالة الخريطة */}
        <MapStateManager />
      </MapContainer>
      
      {/* عرض الإحداثيات */}
      <CoordinateDisplay
        coordinates={coordinates}
        format={coordinateFormat}
        onFormatChange={setCoordinateFormat}
      />
    </div>
  );
}