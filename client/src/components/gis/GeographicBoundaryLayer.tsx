import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';

interface GeographicBoundaryLayerProps {
  selectedGovernorateId?: string;
  selectedDistrictId?: string;
  onBoundaryClick?: (type: 'governorate' | 'district', id: string, name: string) => void;
}

interface GeometryData {
  type: string;
  coordinates: any; // GeoJSON coordinates can be complex nested arrays
}

interface BoundaryFeature {
  id: string;
  nameAr: string;
  nameEn?: string;
  geometry: GeometryData;
}

// Component to render a single boundary (governorate or district)
function BoundaryPolygon({ 
  feature, 
  type, 
  isSelected, 
  onClick 
}: { 
  feature: BoundaryFeature; 
  type: 'governorate' | 'district';
  isSelected: boolean;
  onClick?: (type: 'governorate' | 'district', id: string, name: string) => void;
}) {
  const map = useMap();

  // Convert GeoJSON coordinates to Leaflet format
  const leafletCoordinates = useMemo(() => {
    if (!feature.geometry || !feature.geometry.coordinates) {
      return [];
    }

    try {
      // Handle MultiPolygon geometry
      if (feature.geometry.type === 'MultiPolygon') {
        return feature.geometry.coordinates.map((polygon: any) => 
          polygon[0].map((coord: any) => [coord[1], coord[0]] as [number, number])
        );
      }
      // Handle Polygon geometry
      else if (feature.geometry.type === 'Polygon') {
        return [feature.geometry.coordinates[0].map((coord: any) => [coord[1], coord[0]] as [number, number])];
      }
      return [];
    } catch (error) {
      console.error('Error parsing geometry coordinates:', error);
      return [];
    }
  }, [feature.geometry]);

  // Define colors based on type and selection state
  const pathOptions = useMemo(() => ({
    color: isSelected ? 
      (type === 'governorate' ? '#dc3545' : '#28a745') : 
      (type === 'governorate' ? '#6c757d' : '#17a2b8'),
    fillColor: isSelected ? 
      (type === 'governorate' ? '#dc3545' : '#28a745') : 
      (type === 'governorate' ? '#6c757d' : '#17a2b8'),
    fillOpacity: isSelected ? 0.3 : 0.1,
    weight: isSelected ? 3 : 2,
    opacity: 0.8
  }), [type, isSelected]);

  // Handle polygon click
  const handleClick = () => {
    if (onClick) {
      onClick(type, feature.id, feature.nameAr);
    }
  };

  if (leafletCoordinates.length === 0) {
    return null;
  }

  return (
    <>
      {leafletCoordinates.map((coordinates: [number, number][], index: number) => (
        <Polygon
          key={`${feature.id}-${index}`}
          positions={coordinates}
          pathOptions={pathOptions}
          eventHandlers={{
            click: handleClick,
            mouseover: (e) => {
              const tooltip = L.tooltip({
                permanent: false,
                direction: 'top',
                offset: [0, -10]
              })
                .setContent(`${type === 'governorate' ? 'المحافظة' : 'المديرية'}: ${feature.nameAr}`)
                .setLatLng(e.latlng);
              
              tooltip.addTo(map);
              
              // Store tooltip reference to remove it later
              (e.target as any)._tooltip = tooltip;
            },
            mouseout: (e) => {
              // Remove tooltip on mouseout
              if ((e.target as any)._tooltip) {
                map.removeLayer((e.target as any)._tooltip);
                (e.target as any)._tooltip = null;
              }
            }
          }}
        />
      ))}
    </>
  );
}

export default function GeographicBoundaryLayer({
  selectedGovernorateId,
  selectedDistrictId,
  onBoundaryClick
}: GeographicBoundaryLayerProps) {
  const map = useMap();

  // Fetch all governorates with geometry
  const { data: governorates = [] } = useQuery<BoundaryFeature[]>({
    queryKey: ['/api/governorates'],
    select: (data: any[]) => data.filter(gov => gov.geometry) // Only include governorates with geometry data
  });

  // Fetch districts for selected governorate with geometry
  const { data: districts = [] } = useQuery<BoundaryFeature[]>({
    queryKey: ['/api/districts', { governorateId: selectedGovernorateId }],
    enabled: !!selectedGovernorateId,
    select: (data: any[]) => data.filter(dist => dist.geometry) // Only include districts with geometry data
  });

  // Auto-fit map to selected boundary with priority: District > Governorate
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const fitMapToBoundary = () => {
      // Priority 1: District (most specific)
      if (selectedDistrictId && districts.length > 0) {
        const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
        if (selectedDistrict && selectedDistrict.geometry) {
          try {
            const featureGroup = L.featureGroup();
            
            if (selectedDistrict.geometry.type === 'MultiPolygon') {
              selectedDistrict.geometry.coordinates.forEach((polygon: any) => {
                const coords = polygon[0].map((coord: any) => [coord[1], coord[0]] as [number, number]);
                L.polygon(coords).addTo(featureGroup);
              });
            } else if (selectedDistrict.geometry.type === 'Polygon') {
              const coords = selectedDistrict.geometry.coordinates[0].map((coord: any) => [coord[1], coord[0]] as [number, number]);
              L.polygon(coords).addTo(featureGroup);
            }
            
            if (featureGroup.getLayers().length > 0) {
              // For districts, use more focused padding for better zoom
              map.fitBounds(featureGroup.getBounds(), { 
                padding: [30, 30],
                maxZoom: 12 // Prevent excessive zoom-in
              });
              console.log(`🎯 Focused map on district: ${selectedDistrict.nameAr}`);
            }
            return;
          } catch (error) {
            console.error('Error fitting bounds for district:', error);
          }
        }
      }
      
      // Priority 2: Governorate (fallback when no district selected)
      if (selectedGovernorateId && governorates.length > 0) {
        const selectedGov = governorates.find(g => g.id === selectedGovernorateId);
        if (selectedGov && selectedGov.geometry) {
          try {
            const featureGroup = L.featureGroup();
            
            if (selectedGov.geometry.type === 'MultiPolygon') {
              selectedGov.geometry.coordinates.forEach((polygon: any) => {
                const coords = polygon[0].map((coord: any) => [coord[1], coord[0]] as [number, number]);
                L.polygon(coords).addTo(featureGroup);
              });
            } else if (selectedGov.geometry.type === 'Polygon') {
              const coords = selectedGov.geometry.coordinates[0].map((coord: any) => [coord[1], coord[0]] as [number, number]);
              L.polygon(coords).addTo(featureGroup);
            }
            
            if (featureGroup.getLayers().length > 0) {
              // For governorates, use moderate padding
              map.fitBounds(featureGroup.getBounds(), { 
                padding: [40, 40],
                maxZoom: 10 // Prevent excessive zoom-in for large areas
              });
              console.log(`🗺️ Focused map on governorate: ${selectedGov.nameAr}`);
            }
          } catch (error) {
            console.error('Error fitting bounds for governorate:', error);
          }
        }
      }
    };
    
    // Use timeout to avoid rapid successive calls during quick selections
    timeoutId = setTimeout(fitMapToBoundary, 100);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedGovernorateId, selectedDistrictId, governorates, districts, map]);

  return (
    <>
      {/* Render all governorates with subtle styling */}
      {governorates.map(governorate => (
        <BoundaryPolygon
          key={`gov-${governorate.id}`}
          feature={governorate}
          type="governorate"
          isSelected={governorate.id === selectedGovernorateId}
          onClick={onBoundaryClick}
        />
      ))}
      
      {/* Render districts for selected governorate with more prominent styling */}
      {districts.map(district => (
        <BoundaryPolygon
          key={`dist-${district.id}`}
          feature={district}
          type="district"
          isSelected={district.id === selectedDistrictId}
          onClick={onBoundaryClick}
        />
      ))}
    </>
  );
}