import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Ruler, 
  Navigation, 
  Square, 
  MapPin, 
  Route, 
  RotateCw,
  Compass
} from 'lucide-react';

interface Coordinate {
  lat: number;
  lng: number;
}

interface GeometryMeasurement {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'rectangle' | 'circle';
  name?: string;
  coordinates: number[][];
  measurements?: {
    area?: number;
    perimeter?: number;
    length?: number;
    edges?: EdgeMeasurement[];
    center?: Coordinate;
  };
}

interface EdgeMeasurement {
  from: Coordinate;
  to: Coordinate;
  length: number; // meters
  bearing: number; // degrees from north
  direction: string; // N, NE, E, SE, S, SW, W, NW
}

interface MeasurementPanelProps {
  geometries: GeometryMeasurement[];
  selectedGeometry?: string;
  onGeometrySelect?: (id: string) => void;
  showCoordinates?: boolean;
  className?: string;
}

// Utility functions for geographic calculations
class GeoCalculations {
  
  // Calculate distance between two points using Haversine formula
  static distanceBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Calculate bearing between two points
  static bearingBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360; // Convert to degrees and normalize
  }

  // Convert bearing to compass direction
  static bearingToDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  // Calculate polygon area using shoelace formula
  static polygonArea(coordinates: number[][]): number {
    let area = 0;
    const n = coordinates.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [lng1, lat1] = coordinates[i];
      const [lng2, lat2] = coordinates[j];
      area += lng1 * lat2 - lng2 * lat1;
    }
    
    area = Math.abs(area) / 2;
    // Convert from degrees² to square meters (rough approximation)
    const metersPerDegree = 111111; // At equator
    return area * metersPerDegree * metersPerDegree;
  }

  // Calculate perimeter of polygon
  static polygonPerimeter(coordinates: number[][]): number {
    let perimeter = 0;
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lng1, lat1] = coordinates[i];
      const [lng2, lat2] = coordinates[i + 1];
      perimeter += this.distanceBetween(lat1, lng1, lat2, lng2);
    }
    
    return perimeter;
  }

  // Calculate line length
  static lineLength(coordinates: number[][]): number {
    let length = 0;
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lng1, lat1] = coordinates[i];
      const [lng2, lat2] = coordinates[i + 1];
      length += this.distanceBetween(lat1, lng1, lat2, lng2);
    }
    
    return length;
  }

  // Get edge measurements for polygon or line
  static getEdgeMeasurements(coordinates: number[][]): EdgeMeasurement[] {
    const edges: EdgeMeasurement[] = [];
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lng1, lat1] = coordinates[i];
      const [lng2, lat2] = coordinates[i + 1];
      
      const length = this.distanceBetween(lat1, lng1, lat2, lng2);
      const bearing = this.bearingBetween(lat1, lng1, lat2, lng2);
      const direction = this.bearingToDirection(bearing);
      
      edges.push({
        from: { lat: lat1, lng: lng1 },
        to: { lat: lat2, lng: lng2 },
        length,
        bearing,
        direction
      });
    }
    
    return edges;
  }

  // Calculate centroid of polygon
  static polygonCentroid(coordinates: number[][]): Coordinate {
    let lat = 0;
    let lng = 0;
    
    for (const coord of coordinates) {
      lng += coord[0];
      lat += coord[1];
    }
    
    return {
      lat: lat / coordinates.length,
      lng: lng / coordinates.length
    };
  }

  // Process geometry and calculate all measurements
  static processGeometry(geometry: GeometryMeasurement): GeometryMeasurement {
    const { type, coordinates } = geometry;
    
    switch (type) {
      case 'point':
        return {
          ...geometry,
          measurements: {
            center: { lat: coordinates[0][1], lng: coordinates[0][0] }
          }
        };
        
      case 'line':
        const lineLength = this.lineLength(coordinates);
        const lineEdges = this.getEdgeMeasurements(coordinates);
        return {
          ...geometry,
          measurements: {
            length: lineLength,
            edges: lineEdges
          }
        };
        
      case 'polygon':
      case 'rectangle':
        const area = this.polygonArea(coordinates);
        const perimeter = this.polygonPerimeter(coordinates);
        const edges = this.getEdgeMeasurements(coordinates);
        const center = this.polygonCentroid(coordinates);
        return {
          ...geometry,
          measurements: {
            area,
            perimeter,
            edges,
            center
          }
        };
        
      case 'circle':
        // For circle, calculate approximate area
        const circleArea = this.polygonArea(coordinates);
        const circlePerimeter = this.polygonPerimeter(coordinates);
        const circleCenter = this.polygonCentroid(coordinates);
        return {
          ...geometry,
          measurements: {
            area: circleArea,
            perimeter: circlePerimeter,
            center: circleCenter
          }
        };
        
      default:
        return geometry;
    }
  }
}

// Format numbers for display
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters.toFixed(1)} م`;
  } else {
    return `${(meters / 1000).toFixed(2)} كم`;
  }
};

const formatArea = (squareMeters: number): string => {
  if (squareMeters < 10000) {
    return `${squareMeters.toFixed(1)} م²`;
  } else {
    return `${(squareMeters / 10000).toFixed(2)} هكتار`;
  }
};

const formatBearing = (degrees: number): string => {
  return `${degrees.toFixed(1)}°`;
};

const formatCoordinate = (lat: number, lng: number): string => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

export default function MeasurementPanel({
  geometries,
  selectedGeometry,
  onGeometrySelect,
  showCoordinates = true,
  className = ""
}: MeasurementPanelProps) {
  
  // Process all geometries to calculate measurements
  const processedGeometries = geometries.map(geometry => 
    GeoCalculations.processGeometry(geometry)
  );

  const getGeometryIcon = (type: string) => {
    switch (type) {
      case 'point': return MapPin;
      case 'line': return Route;
      case 'polygon': return Ruler;
      case 'rectangle': return Square;
      case 'circle': return RotateCw;
      default: return Ruler;
    }
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="measurement-panel">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ruler className="h-5 w-5" />
            لوحة المقاييس والقياسات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {processedGeometries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ruler className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد أشكال هندسية للقياس</p>
              <p className="text-sm">ارسم أشكالاً على الخريطة لعرض القياسات</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Summary Statistics */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {processedGeometries.length}
                  </div>
                  <div className="text-sm text-muted-foreground">إجمالي الأشكال</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {processedGeometries.filter(g => g.type === 'polygon' || g.type === 'rectangle').length}
                  </div>
                  <div className="text-sm text-muted-foreground">المضلعات</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {processedGeometries.filter(g => g.type === 'line').length}
                  </div>
                  <div className="text-sm text-muted-foreground">الخطوط</div>
                </div>
              </div>

              <Separator />

              {/* Individual Geometry Measurements */}
              <div className="space-y-3">
                {processedGeometries.map((geometry, index) => {
                  const IconComponent = getGeometryIcon(geometry.type);
                  const isSelected = selectedGeometry === geometry.id;
                  
                  return (
                    <Card 
                      key={geometry.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => onGeometrySelect?.(geometry.id)}
                      data-testid={`geometry-measurement-${geometry.id}`}
                    >
                      <CardContent className="p-4">
                        
                        {/* Geometry Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            <span className="font-medium">
                              {geometry.name || `${getGeometryTypeArabic(geometry.type)} ${index + 1}`}
                            </span>
                          </div>
                          <Badge variant={isSelected ? "default" : "secondary"}>
                            {geometry.type}
                          </Badge>
                        </div>

                        {/* Basic Measurements */}
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          {geometry.measurements?.area && (
                            <div className="flex items-center gap-2">
                              <Square className="h-4 w-4 text-green-600" />
                              <div>
                                <div className="text-sm text-muted-foreground">المساحة</div>
                                <div className="font-medium">{formatArea(geometry.measurements.area)}</div>
                              </div>
                            </div>
                          )}
                          
                          {geometry.measurements?.perimeter && (
                            <div className="flex items-center gap-2">
                              <Ruler className="h-4 w-4 text-blue-600" />
                              <div>
                                <div className="text-sm text-muted-foreground">المحيط</div>
                                <div className="font-medium">{formatDistance(geometry.measurements.perimeter)}</div>
                              </div>
                            </div>
                          )}
                          
                          {geometry.measurements?.length && (
                            <div className="flex items-center gap-2">
                              <Route className="h-4 w-4 text-orange-600" />
                              <div>
                                <div className="text-sm text-muted-foreground">الطول</div>
                                <div className="font-medium">{formatDistance(geometry.measurements.length)}</div>
                              </div>
                            </div>
                          )}
                          
                          {geometry.measurements?.center && showCoordinates && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-600" />
                              <div>
                                <div className="text-sm text-muted-foreground">المركز</div>
                                <div className="font-mono text-xs">
                                  {formatCoordinate(geometry.measurements.center.lat, geometry.measurements.center.lng)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Edge Measurements */}
                        {geometry.measurements?.edges && geometry.measurements.edges.length > 0 && (
                          <div className="border-t pt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Compass className="h-4 w-4" />
                              <span className="text-sm font-medium">قياسات الأضلاع</span>
                            </div>
                            <div className="space-y-2">
                              {geometry.measurements.edges.map((edge, edgeIndex) => (
                                <div 
                                  key={edgeIndex}
                                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                                  data-testid={`edge-measurement-${edgeIndex}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-xs">
                                      ضلع {edgeIndex + 1}
                                    </Badge>
                                    <span>{formatDistance(edge.length)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <Navigation className="h-3 w-3" />
                                      <span className="font-mono">{formatBearing(edge.bearing)}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {edge.direction}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to get Arabic names for geometry types
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

export { GeoCalculations };
export type { GeometryMeasurement, EdgeMeasurement, Coordinate };