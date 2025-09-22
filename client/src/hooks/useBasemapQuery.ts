import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface BasemapOverlay {
  id: string;
  status: string;
  overlay?: any;
  geoJsonOverlay?: any;
  outputFiles?: string[];
}

interface BasemapResponse {
  success: boolean;
  data: {
    overlays: BasemapOverlay[];
    total: number;
  };
}

/**
 * Custom hook for fetching basemap data for a specific target
 * Normalizes the response and handles different API formats
 */
export const useBasemapQuery = (targetType: string, targetId: string) => {
  return useQuery({
    queryKey: ['/api/geo-jobs', { targetType, targetId, includeOverlay: true }],
    queryFn: async () => {
      if (!targetId || targetId === 'all') {
        return null;
      }

      const response = await fetch(
        `/api/geo-jobs?targetId=${targetId}&targetType=${targetType}&includeOverlay=true`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token') || 'mock-token'}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json: BasemapResponse = await response.json();
      console.log('🗺️ Raw basemap API response:', json);

      // Normalize response - handle different API formats
      let overlays: BasemapOverlay[] = [];
      
      if (json?.data?.overlays && Array.isArray(json.data.overlays)) {
        // New format: {success: true, data: {overlays: [...], total: N}}
        overlays = json.data.overlays;
      } else if (Array.isArray(json)) {
        // Legacy format: direct array
        overlays = json;
      }

      // Find the first available overlay
      const availableOverlay = overlays.find(job => 
        job.status === 'available' && (job.overlay || job.geoJsonOverlay)
      );

      console.log('🔍 Basemap query result:', {
        totalOverlays: overlays.length,
        availableOverlay: !!availableOverlay,
        overlayId: availableOverlay?.id
      });

      return availableOverlay || null;
    },
    enabled: !!targetId && targetId !== 'all',
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 2;
    }
  });
};

/**
 * Utility function to invalidate basemap cache
 */
export const invalidateBasemapQuery = (targetType: string, targetId: string) => {
  queryClient.invalidateQueries({
    queryKey: ['/api/geo-jobs', { targetType, targetId, includeOverlay: true }]
  });
};