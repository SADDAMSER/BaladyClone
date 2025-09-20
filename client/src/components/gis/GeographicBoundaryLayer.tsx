import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';

interface GeographicBoundaryLayerProps {
  selectedGovernorateId?: string;
  selectedDistrictId?: string;
  selectedSubDistrictId?: string;
  selectedSectorId?: string;
  selectedNeighborhoodUnitId?: string;
  selectedBlockId?: string;
  onBoundaryClick?: (type: 'governorate' | 'district' | 'subDistrict' | 'sector' | 'neighborhoodUnit' | 'block', id: string, name: string) => void;
  onGovernorateSelect?: (governorateId: string) => void;
  onDistrictSelect?: (districtId: string) => void;
  onSubDistrictSelect?: (subDistrictId: string) => void;
  onSectorSelect?: (sectorId: string) => void;
  onNeighborhoodUnitSelect?: (neighborhoodUnitId: string) => void;
  onBlockSelect?: (blockId: string) => void;
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

// Component to render a single boundary (governorate, district, sub-district, sector, neighborhood unit, or block)
function BoundaryPolygon({ 
  feature, 
  type, 
  isSelected, 
  onClick 
}: { 
  feature: BoundaryFeature; 
  type: 'governorate' | 'district' | 'subDistrict' | 'sector' | 'neighborhoodUnit' | 'block';
  isSelected: boolean;
  onClick?: (type: 'governorate' | 'district' | 'subDistrict' | 'sector' | 'neighborhoodUnit' | 'block', id: string, name: string) => void;
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
  const pathOptions = useMemo(() => {
    const colorScheme = {
      governorate: { normal: '#6c757d', selected: '#dc3545' },
      district: { normal: '#17a2b8', selected: '#28a745' },
      subDistrict: { normal: '#ffc107', selected: '#fd7e14' },
      sector: { normal: '#6f42c1', selected: '#e83e8c' },
      neighborhoodUnit: { normal: '#20c997', selected: '#198754' },
      block: { normal: '#fd7e14', selected: '#dc3545' }
    };
    
    const colors = colorScheme[type] || colorScheme.governorate;
    
    return {
      color: isSelected ? colors.selected : colors.normal,
      fillColor: isSelected ? colors.selected : colors.normal,
      fillOpacity: isSelected ? 0.4 : 0.15,
      weight: isSelected ? 3 : 2,
      opacity: 0.8
    };
  }, [type, isSelected]);

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
              const typeLabels = {
                governorate: 'المحافظة',
                district: 'المديرية',
                subDistrict: 'العزلة',
                sector: 'القطاع',
                neighborhoodUnit: 'وحدة الجوار',
                block: 'البلوك'
              };
              
              const tooltip = L.tooltip({
                permanent: false,
                direction: 'top',
                offset: [0, -10]
              })
                .setContent(`${typeLabels[type] || 'المنطقة'}: ${feature.nameAr}`)
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
  selectedSubDistrictId,
  selectedSectorId,
  selectedNeighborhoodUnitId,
  selectedBlockId,
  onBoundaryClick,
  onGovernorateSelect,
  onDistrictSelect,
  onSubDistrictSelect,
  onSectorSelect,
  onNeighborhoodUnitSelect,
  onBlockSelect
}: GeographicBoundaryLayerProps) {
  const map = useMap();

  // Fetch all governorates with geometry
  const { data: governorates = [] } = useQuery<BoundaryFeature[]>({
    queryKey: ['governorates'],
    queryFn: () => fetch('/api/governorates').then(res => res.json()),
    select: (data: any[]) => data.filter(gov => gov.geometry) // Only include governorates with geometry data
  });

  // Fetch districts for selected governorate with geometry
  const { data: districts = [] } = useQuery<BoundaryFeature[]>({
    queryKey: ['districts', selectedGovernorateId],
    queryFn: () => fetch(`/api/districts?governorateId=${selectedGovernorateId}`).then(res => res.json()),
    enabled: !!selectedGovernorateId,
    select: (data: any[]) => data.filter(dist => dist.geometry) // Only include districts with geometry data
  });

  // Fetch sub-districts for selected district with geometry
  const { data: subDistricts = [] } = useQuery<BoundaryFeature[]>({
    queryKey: ['sub-districts', selectedDistrictId],
    queryFn: () => fetch(`/api/sub-districts?districtId=${selectedDistrictId}`).then(res => res.json()),
    enabled: !!selectedDistrictId,
    select: (data: any[]) => {
      return data
        .filter(subDist => subDist.geometry)
        .map(subDist => ({
          ...subDist,
          id: subDist.admin3Pcod || subDist.id,
          nameAr: subDist.admin3Na_1 || subDist.nameAr || subDist.name || 'غير محدد'
        }));
    }
  });

  // FIXED: Fetch sectors for selected SUB-DISTRICT using correct endpoint with geometry and data transformation
  const { data: sectors = [] } = useQuery<BoundaryFeature[]>({
    queryKey: ['sectors', selectedSubDistrictId],
    queryFn: () => fetch(`/api/sectors?subDistrictId=${selectedSubDistrictId}`).then(res => res.json()),
    enabled: !!selectedSubDistrictId,
    select: (data: any[]) => {
      return data
        .filter(sector => sector.geometry)
        .map(sector => ({
          ...sector,
          id: sector.id,
          nameAr: sector.Zone_ || sector.nameAr || sector.name || 'غير محدد'
        }));
    }
  });

  // Fetch neighborhood units for selected sector with geometry
  const { data: neighborhoodUnits = [] } = useQuery<BoundaryFeature[]>({
    queryKey: ['neighborhood-units', selectedSectorId],
    queryFn: () => fetch(`/api/neighborhood-units?sectorId=${selectedSectorId}`).then(res => res.json()),
    enabled: !!selectedSectorId,
    select: (data: any[]) => {
      return data
        .filter(unit => unit.geometry)
        .map(unit => ({
          ...unit,
          id: unit.id,
          nameAr: unit['ÑÞã_æÍÏÉ_Ç'] || unit.nameAr || unit.name || 'غير محدد'
        }));
    }
  });

  // Fetch blocks for selected neighborhood unit with geometry
  const { data: blocks = [] } = useQuery<BoundaryFeature[]>({
    queryKey: ['blocks', selectedNeighborhoodUnitId],
    queryFn: () => fetch(`/api/blocks?neighborhoodUnitId=${selectedNeighborhoodUnitId}`).then(res => res.json()),
    enabled: !!selectedNeighborhoodUnitId,
    select: (data: any[]) => data.filter(block => block.geometry) // Blocks should already have correct structure
  });

  // Auto-fit map to selected boundary with priority: Block > NeighborhoodUnit > Sector > SubDistrict > District > Governorate
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const fitMapToBoundary = () => {
      // Helper function to fit bounds for any geographic entity
      const fitBounds = (entity: BoundaryFeature, type: string, maxZoom: number, padding: [number, number] = [30, 30]) => {
        try {
          const featureGroup = L.featureGroup();
          
          if (entity.geometry.type === 'MultiPolygon') {
            entity.geometry.coordinates.forEach((polygon: any) => {
              const coords = polygon[0].map((coord: any) => [coord[1], coord[0]] as [number, number]);
              L.polygon(coords).addTo(featureGroup);
            });
          } else if (entity.geometry.type === 'Polygon') {
            const coords = entity.geometry.coordinates[0].map((coord: any) => [coord[1], coord[0]] as [number, number]);
            L.polygon(coords).addTo(featureGroup);
          }
          
          if (featureGroup.getLayers().length > 0) {
            map.fitBounds(featureGroup.getBounds(), { 
              padding,
              maxZoom
            });
            console.log(`🎯 Focused map on ${type}: ${entity.nameAr}`);
          }
          return true;
        } catch (error) {
          console.error(`Error fitting bounds for ${type}:`, error);
          return false;
        }
      };

      // Priority 1: Block (most specific)
      if (selectedBlockId && blocks.length > 0) {
        const selectedBlock = blocks.find(b => b.id === selectedBlockId);
        if (selectedBlock && selectedBlock.geometry) {
          if (fitBounds(selectedBlock, 'block', 16, [10, 10])) return;
        }
      }

      // Priority 2: Neighborhood Unit
      if (selectedNeighborhoodUnitId && neighborhoodUnits.length > 0) {
        const selectedUnit = neighborhoodUnits.find(u => u.id === selectedNeighborhoodUnitId);
        if (selectedUnit && selectedUnit.geometry) {
          if (fitBounds(selectedUnit, 'neighborhood unit', 15, [15, 15])) return;
        }
      }

      // Priority 3: Sector
      if (selectedSectorId && sectors.length > 0) {
        const selectedSector = sectors.find(s => s.id === selectedSectorId);
        if (selectedSector && selectedSector.geometry) {
          if (fitBounds(selectedSector, 'sector', 14, [20, 20])) return;
        }
      }

      // Priority 4: Sub-District
      if (selectedSubDistrictId && subDistricts.length > 0) {
        const selectedSubDistrict = subDistricts.find(sd => sd.id === selectedSubDistrictId);
        if (selectedSubDistrict && selectedSubDistrict.geometry) {
          if (fitBounds(selectedSubDistrict, 'sub-district', 13, [25, 25])) return;
        }
      }
      
      // Priority 5: District
      if (selectedDistrictId && districts.length > 0) {
        const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
        if (selectedDistrict && selectedDistrict.geometry) {
          if (fitBounds(selectedDistrict, 'district', 12, [30, 30])) return;
        }
      }
      
      // Priority 6: Governorate (fallback when no other selections)
      if (selectedGovernorateId && governorates.length > 0) {
        const selectedGov = governorates.find(g => g.id === selectedGovernorateId);
        if (selectedGov && selectedGov.geometry) {
          fitBounds(selectedGov, 'governorate', 10, [40, 40]);
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
  }, [selectedGovernorateId, selectedDistrictId, selectedSubDistrictId, selectedSectorId, selectedNeighborhoodUnitId, selectedBlockId, governorates, districts, subDistricts, sectors, neighborhoodUnits, blocks, map]);

  return (
    <>
      {/* Render all governorates with subtle styling */}
      {governorates.map(governorate => (
        <BoundaryPolygon
          key={`gov-${governorate.id}`}
          feature={governorate}
          type="governorate"
          isSelected={governorate.id === selectedGovernorateId}
          onClick={(type, id, name) => {
            onBoundaryClick?.(type, id, name);
            if (type === 'governorate') {
              onGovernorateSelect?.(id);
            }
          }}
        />
      ))}
      
      {/* Render districts for selected governorate with more prominent styling */}
      {districts.map(district => (
        <BoundaryPolygon
          key={`dist-${district.id}`}
          feature={district}
          type="district"
          isSelected={district.id === selectedDistrictId}
          onClick={(type, id, name) => {
            onBoundaryClick?.(type, id, name);
            if (type === 'district') {
              onDistrictSelect?.(id);
            }
          }}
        />
      ))}

      {/* Render sub-districts for selected district */}
      {subDistricts.map(subDistrict => (
        <BoundaryPolygon
          key={`sub-${subDistrict.id}`}
          feature={subDistrict}
          type="subDistrict"
          isSelected={subDistrict.id === selectedSubDistrictId}
          onClick={(type, id, name) => {
            onBoundaryClick?.(type, id, name);
            if (type === 'subDistrict') {
              onSubDistrictSelect?.(id);
            }
          }}
        />
      ))}

      {/* Render sectors for selected governorate */}
      {sectors.map(sector => (
        <BoundaryPolygon
          key={`sector-${sector.id}`}
          feature={sector}
          type="sector"
          isSelected={sector.id === selectedSectorId}
          onClick={(type, id, name) => {
            onBoundaryClick?.(type, id, name);
            if (type === 'sector') {
              onSectorSelect?.(id);
            }
          }}
        />
      ))}

      {/* Render neighborhood units for selected sector */}
      {neighborhoodUnits.map(unit => (
        <BoundaryPolygon
          key={`unit-${unit.id}`}
          feature={unit}
          type="neighborhoodUnit"
          isSelected={unit.id === selectedNeighborhoodUnitId}
          onClick={(type, id, name) => {
            onBoundaryClick?.(type, id, name);
            if (type === 'neighborhoodUnit') {
              onNeighborhoodUnitSelect?.(id);
            }
          }}
        />
      ))}

      {/* Render blocks for selected neighborhood unit */}
      {blocks.map(block => (
        <BoundaryPolygon
          key={`block-${block.id}`}
          feature={block}
          type="block"
          isSelected={block.id === selectedBlockId}
          onClick={(type, id, name) => {
            onBoundaryClick?.(type, id, name);
            if (type === 'block') {
              onBlockSelect?.(id);
            }
          }}
        />
      ))}
    </>
  );
}