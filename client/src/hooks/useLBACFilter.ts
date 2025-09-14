import { useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';

export interface LBACFilterOptions {
  // Application filtering options
  includeApplications?: boolean;
  includePlots?: boolean;
  includeAssignments?: boolean;
  
  // Geographic level filtering
  strictMode?: boolean; // If true, only exact level matches, if false allows hierarchical inheritance
}

export interface FilterableApplication {
  id: string;
  plotId?: string;
  applicationData?: {
    plotInfo?: {
      neighborhoodId?: string;
      subDistrictId?: string;
      districtId?: string;
      governorateId?: string;
    };
    location?: {
      neighborhoodId?: string;
      subDistrictId?: string;
      districtId?: string;
      governorateId?: string;
    };
  };
  // Support direct geographic fields
  neighborhoodId?: string;
  subDistrictId?: string;
  districtId?: string;
  governorateId?: string;
}

export interface FilterablePlot {
  id: string;
  neighborhoodId?: string;
  subDistrictId?: string;
  districtId?: string;
  governorateId?: string;
  blockId?: string;
  // Support nested block structure
  block?: {
    neighborhoodId?: string;
    subDistrictId?: string;
    districtId?: string;
    governorateId?: string;
    neighborhoodUnit?: {
      neighborhoodId?: string;
      subDistrictId?: string;
      districtId?: string;
      governorateId?: string;
    };
  };
}

export interface FilterableAssignment {
  id: string;
  applicationId?: string;
  application?: FilterableApplication;
  // Direct geographic context if available
  targetGeographicScope?: {
    neighborhoodIds?: string[];
    subDistrictIds?: string[];
    districtIds?: string[];
    governorateIds?: string[];
  };
}

export interface FilterableGeographicItem {
  id: string;
  type: 'governorate' | 'district' | 'subDistrict' | 'neighborhood' | 'block' | 'plot';
  parentId?: string; // For hierarchical relationships
  governorateId?: string;
  districtId?: string;
  subDistrictId?: string;
  neighborhoodId?: string;
}

/**
 * LBAC Filter Hook - applies Location-Based Access Control to frontend data
 * يطبق التحكم في الوصول القائم على الموقع على بيانات الواجهة الأمامية
 */
export function useLBACFilter(options: LBACFilterOptions = {}) {
  const { 
    getUserGeographicScope, 
    canAccessGovernorate, 
    canAccessDistrict, 
    canAccessSubDistrict, 
    canAccessNeighborhood,
    user
  } = useAuth();

  const userScope = getUserGeographicScope();
  const isAdmin = user?.role === 'admin';

  /**
   * Extract geographic IDs from an application using various possible data structures
   */
  const extractApplicationGeography = (app: FilterableApplication) => {
    // Try multiple possible data structures
    const geoSources = [
      app.applicationData?.plotInfo,
      app.applicationData?.location,
      app, // Direct fields on application
    ];

    for (const source of geoSources) {
      if (source?.governorateId || source?.districtId || source?.subDistrictId || source?.neighborhoodId) {
        return {
          governorateId: source.governorateId,
          districtId: source.districtId,
          subDistrictId: source.subDistrictId,
          neighborhoodId: source.neighborhoodId,
        };
      }
    }

    return null;
  };

  /**
   * Extract geographic IDs from a plot using hierarchical structure
   */
  const extractPlotGeography = (plot: FilterablePlot) => {
    // Try direct fields first
    if (plot.governorateId || plot.districtId || plot.subDistrictId || plot.neighborhoodId) {
      return {
        governorateId: plot.governorateId,
        districtId: plot.districtId,
        subDistrictId: plot.subDistrictId,
        neighborhoodId: plot.neighborhoodId,
      };
    }

    // Try through block hierarchy
    if (plot.block) {
      if (plot.block.governorateId || plot.block.districtId || plot.block.subDistrictId || plot.block.neighborhoodId) {
        return {
          governorateId: plot.block.governorateId,
          districtId: plot.block.districtId,
          subDistrictId: plot.block.subDistrictId,
          neighborhoodId: plot.block.neighborhoodId,
        };
      }

      // Try through neighborhood unit
      if (plot.block.neighborhoodUnit) {
        return {
          governorateId: plot.block.neighborhoodUnit.governorateId,
          districtId: plot.block.neighborhoodUnit.districtId,
          subDistrictId: plot.block.neighborhoodUnit.subDistrictId,
          neighborhoodId: plot.block.neighborhoodUnit.neighborhoodId,
        };
      }
    }

    return null;
  };

  /**
   * Check if user can access a specific geographic item using hierarchical inheritance
   */
  const canAccessGeographicItem = (geography: { 
    governorateId?: string; 
    districtId?: string; 
    subDistrictId?: string; 
    neighborhoodId?: string; 
  } | null): boolean => {
    if (isAdmin) return true;
    if (!geography) return false; // CRITICAL FIX: Deny access when no geographic data
    if (!userScope) return false;

    // Check access level by level - most specific first
    if (geography.neighborhoodId && canAccessNeighborhood(geography.neighborhoodId)) {
      return true;
    }
    if (geography.subDistrictId && canAccessSubDistrict(geography.subDistrictId)) {
      return true;
    }
    if (geography.districtId && canAccessDistrict(geography.districtId)) {
      return true;
    }
    if (geography.governorateId && canAccessGovernorate(geography.governorateId)) {
      return true;
    }

    return false;
  };

  // Filter functions using useMemo for performance
  const filters = useMemo(() => ({
    /**
     * Filter applications based on user's geographic scope
     * فلترة الطلبات حسب النطاق الجغرافي للمستخدم
     */
    filterApplications: <T extends FilterableApplication>(applications: T[]): T[] => {
      if (isAdmin) return applications;
      if (!userScope) return [];

      return applications.filter(app => {
        const geography = extractApplicationGeography(app);
        // SECURITY: Explicitly deny applications without geographic data
        if (!geography) return false;
        return canAccessGeographicItem(geography);
      });
    },

    /**
     * Filter plots based on user's geographic scope
     * فلترة قطع الأراضي حسب النطاق الجغرافي للمستخدم
     */
    filterPlots: <T extends FilterablePlot>(plots: T[]): T[] => {
      if (isAdmin) return plots;
      if (!userScope) return [];

      return plots.filter(plot => {
        const geography = extractPlotGeography(plot);
        // SECURITY: Explicitly deny plots without geographic data
        if (!geography) return false;
        return canAccessGeographicItem(geography);
      });
    },

    /**
     * Filter assignments based on geographic scope or related applications
     * فلترة المهام حسب النطاق الجغرافي أو الطلبات المرتبطة
     */
    filterAssignments: <T extends FilterableAssignment>(assignments: T[]): T[] => {
      if (isAdmin) return assignments;
      if (!userScope) return [];

      return assignments.filter(assignment => {
        // Check direct geographic scope if available
        if (assignment.targetGeographicScope) {
          const scope = assignment.targetGeographicScope;
          return (
            scope.governorateIds?.some(id => canAccessGovernorate(id)) ||
            scope.districtIds?.some(id => canAccessDistrict(id)) ||
            scope.subDistrictIds?.some(id => canAccessSubDistrict(id)) ||
            scope.neighborhoodIds?.some(id => canAccessNeighborhood(id))
          );
        }

        // Check through related application
        if (assignment.application) {
          const geography = extractApplicationGeography(assignment.application);
          // SECURITY: Explicitly deny assignments without geographic data
          if (!geography) return false;
          return canAccessGeographicItem(geography);
        }

        // If no geographic context, deny access
        return false;
      });
    },

    /**
     * Filter generic geographic items (governorates, districts, etc.)
     * فلترة العناصر الجغرافية العامة
     */
    filterGeographicItems: <T extends FilterableGeographicItem>(items: T[]): T[] => {
      if (isAdmin) return items;
      if (!userScope) return [];

      return items.filter(item => {
        switch (item.type) {
          case 'governorate':
            return canAccessGovernorate(item.id);
          case 'district':
            return canAccessDistrict(item.id);
          case 'subDistrict':
            return canAccessSubDistrict(item.id);
          case 'neighborhood':
            return canAccessNeighborhood(item.id);
          case 'block':
          case 'plot':
            // For blocks and plots, check parent hierarchy
            const geography = {
              governorateId: item.governorateId,
              districtId: item.districtId,
              subDistrictId: item.subDistrictId,
              neighborhoodId: item.neighborhoodId,
            };
            return canAccessGeographicItem(geography);
          default:
            return false;
        }
      });
    },

    /**
     * Get allowed geographic IDs for queries - useful for API calls
     * الحصول على معرفات جغرافية مسموحة للاستعلامات
     */
    getAllowedGeographicIds: () => {
      if (isAdmin) return null; // Admin can access all
      return userScope;
    },

    /**
     * Check if user can access any data at all
     * التحقق من قدرة المستخدم على الوصول لأي بيانات
     */
    hasAnyGeographicAccess: () => {
      return isAdmin || (userScope && (
        userScope.governorateIds.length > 0 ||
        userScope.districtIds.length > 0 ||
        userScope.subDistrictIds.length > 0 ||
        userScope.neighborhoodIds.length > 0
      ));
    },

    /**
     * Get geographic scope summary for UI display
     * ملخص النطاق الجغرافي لعرضه في الواجهة
     */
    getGeographicScopeSummary: () => {
      if (isAdmin) return { level: 'admin', description: 'جميع المناطق' };
      if (!userScope) return { level: 'none', description: 'لا يوجد نطاق جغرافي' };

      const { mostSpecificLevel } = userScope;
      const levelNames = {
        governorate: 'المحافظة',
        district: 'المديرية', 
        subDistrict: 'المديرية الفرعية',
        neighborhood: 'الحي',
        none: 'غير محدد'
      };

      return {
        level: mostSpecificLevel,
        description: `النطاق: ${levelNames[mostSpecificLevel]}`,
        scope: userScope
      };
    }

  }), [userScope, isAdmin, canAccessGovernorate, canAccessDistrict, canAccessSubDistrict, canAccessNeighborhood]);

  return {
    ...filters,
    userScope,
    isAdmin,
    hasGeographicScope: !!userScope,
  };
}

export default useLBACFilter;