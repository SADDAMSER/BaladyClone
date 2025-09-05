import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, GeoJSON } from 'react-leaflet';
import L, { LatLng, LeafletMouseEvent } from 'leaflet';
import type { DrawingMode } from './DrawingToolbar';
import type { GeoJSONFeature } from '@shared/gis-schema';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DrawingState {
  isDrawing: boolean;
  currentPath: LatLng[];
  tempLayer?: L.Layer;
}

interface InteractiveDrawingMapProps {
  currentMode: DrawingMode;
  onFeatureDrawn: (feature: { geometry: any; featureType: string }) => void;
  features: GeoJSONFeature[];
  featuresVisible: boolean;
  isEnabled: boolean;
}

// Drawing interaction component
function DrawingHandler({ 
  currentMode, 
  onFeatureDrawn, 
  isEnabled 
}: { 
  currentMode: DrawingMode;
  onFeatureDrawn: (feature: { geometry: any; featureType: string }) => void;
  isEnabled: boolean;
}) {
  const map = useMap();
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPath: [],
  });

  // Clear temporary drawing when mode changes
  useEffect(() => {
    if (drawingState.tempLayer) {
      map.removeLayer(drawingState.tempLayer);
    }
    setDrawingState({
      isDrawing: false,
      currentPath: [],
    });
  }, [currentMode, map]);

  const mapEvents = useMapEvents({
    click: (e: LeafletMouseEvent) => {
      if (!isEnabled || !currentMode) return;

      const { lat, lng } = e.latlng;
      
      switch (currentMode) {
        case 'point':
          // Create point immediately
          onFeatureDrawn({
            geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            featureType: 'point'
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
      if (!isEnabled || !currentMode) return;
      
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
      onFeatureDrawn({
        geometry: {
          type: 'LineString',
          coordinates: drawingState.currentPath.map(p => [p.lng, p.lat])
        },
        featureType: 'linestring'
      });
    } else if (currentMode === 'polygon' && drawingState.currentPath.length >= 3) {
      // Close the polygon
      const coordinates = [...drawingState.currentPath, drawingState.currentPath[0]].map(p => [p.lng, p.lat]);
      onFeatureDrawn({
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        },
        featureType: 'polygon'
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
    const coordinates = [[
      [sw.lng, sw.lat], // SW
      [ne.lng, sw.lat], // SE
      [ne.lng, ne.lat], // NE
      [sw.lng, ne.lat], // NW
      [sw.lng, sw.lat], // Close
    ]];

    onFeatureDrawn({
      geometry: {
        type: 'Polygon',
        coordinates
      },
      featureType: 'polygon'
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

    onFeatureDrawn({
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      },
      featureType: 'polygon'
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

  return null;
}

// Feature styling function
const getFeatureStyle = (feature: GeoJSONFeature) => {
  const featureType = feature.properties?.featureType || 'default';
  
  const styles: Record<string, any> = {
    point: {
      color: '#3388ff',
      fillColor: '#3388ff',
      fillOpacity: 0.8,
      radius: 8,
      weight: 2
    },
    linestring: {
      color: '#28a745',
      weight: 3,
      opacity: 0.8
    },
    polygon: {
      color: '#dc3545',
      fillColor: '#dc3545',
      fillOpacity: 0.3,
      weight: 2,
      opacity: 0.8
    },
    default: {
      color: '#6c757d',
      fillColor: '#6c757d',
      fillOpacity: 0.5,
      weight: 2,
      opacity: 0.8
    }
  };

  return styles[featureType] || styles.default;
};

export default function InteractiveDrawingMap({
  currentMode,
  onFeatureDrawn,
  features,
  featuresVisible,
  isEnabled
}: InteractiveDrawingMapProps) {
  return (
    <MapContainer
      center={[15.3694, 44.1910]} // Yemen center
      zoom={7}
      className="h-full w-full"
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      
      {/* Drawing Handler */}
      <DrawingHandler
        currentMode={currentMode}
        onFeatureDrawn={onFeatureDrawn}
        isEnabled={isEnabled}
      />
      
      {/* Existing Features */}
      {featuresVisible && features.length > 0 && (
        <GeoJSON
          key={`features-${features.length}-${Date.now()}`}
          data={{
            type: 'FeatureCollection',
            features: features
          } as any}
          style={(feature) => {
            if (feature) {
              return getFeatureStyle(feature as GeoJSONFeature);
            }
            return {};
          }}
          pointToLayer={(feature, latlng) => {
            const style = getFeatureStyle(feature as GeoJSONFeature);
            return L.circleMarker(latlng, style);
          }}
          onEachFeature={(feature, layer) => {
            // Add popup with feature info
            const props = feature?.properties;
            if (props) {
              const popupContent = `
                <div dir="rtl" class="text-right">
                  <h4 class="font-bold">${props.name || 'معلم غير مسمى'}</h4>
                  <p><strong>النوع:</strong> ${props.type || props.featureType || 'غير محدد'}</p>
                  ${props.description ? `<p><strong>الوصف:</strong> ${props.description}</p>` : ''}
                  ${props.created_by ? `<p><strong>المنشئ:</strong> ${props.created_by}</p>` : ''}
                </div>
              `;
              layer.bindPopup(popupContent);
            }
          }}
        />
      )}
    </MapContainer>
  );
}