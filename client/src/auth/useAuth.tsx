import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  email?: string;
  departmentId?: string;
  positionId?: string;
  geographicAssignments?: UserGeographicAssignment[];
}

interface UserGeographicAssignment {
  id: string;
  governorateId?: string;
  districtId?: string;
  subDistrictId?: string;
  neighborhoodId?: string;
  assignmentType: 'permanent' | 'temporary' | 'emergency';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  // Expanded geographic data for display
  governorate?: { id: string; nameAr: string; nameEn?: string; };
  district?: { id: string; nameAr: string; nameEn?: string; };
  subDistrict?: { id: string; nameAr: string; nameEn?: string; };
  neighborhood?: { id: string; nameAr: string; nameEn?: string; };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  // LBAC Helper Functions
  getUserGeographicScope: () => UserGeographicScope | null;
  canAccessGovernorate: (governorateId: string) => boolean;
  canAccessDistrict: (districtId: string) => boolean;
  canAccessSubDistrict: (subDistrictId: string) => boolean;
  canAccessNeighborhood: (neighborhoodId: string) => boolean;
}

interface UserGeographicScope {
  governorateIds: string[];
  districtIds: string[];
  subDistrictIds: string[];
  neighborhoodIds: string[];
  // Most specific level assigned
  mostSpecificLevel: 'governorate' | 'district' | 'subDistrict' | 'neighborhood' | 'none';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('current_user');
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch (error) {
        // Clear invalid stored data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('current_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  };

  // LBAC Helper Functions Implementation - FIXED with proper hierarchical scope expansion
  const getUserGeographicScope = (): UserGeographicScope | null => {
    if (!user || !user.geographicAssignments || user.geographicAssignments.length === 0) {
      return null;
    }

    // Filter active assignments with temporal validity
    const now = new Date();
    const activeAssignments = user.geographicAssignments.filter(assignment => {
      if (!assignment.isActive) return false;
      
      // Check temporal validity
      const startDate = new Date(assignment.startDate);
      if (startDate > now) return false; // Assignment hasn't started yet
      
      if (assignment.endDate) {
        const endDate = new Date(assignment.endDate);
        if (endDate <= now) return false; // Assignment has expired
      }
      
      return true;
    });
    
    const scope: UserGeographicScope = {
      governorateIds: [],
      districtIds: [],
      subDistrictIds: [],
      neighborhoodIds: [],
      mostSpecificLevel: 'none'
    };

    let mostSpecificLevel = 'none';

    // CRITICAL FIX: Implement hierarchical scope expansion on frontend 
    // that matches the backend logic
    activeAssignments.forEach(assignment => {
      // Direct governorate access grants access to ALL descendants
      if (assignment.governorateId) {
        if (!scope.governorateIds.includes(assignment.governorateId)) {
          scope.governorateIds.push(assignment.governorateId);
          if (mostSpecificLevel === 'none') mostSpecificLevel = 'governorate';
        }
        
        // Governorate access grants access to all districts within it
        // We get the district information from the assignment's expanded data
        if (assignment.governorate && assignment.district?.id) {
          if (!scope.districtIds.includes(assignment.district.id)) {
            scope.districtIds.push(assignment.district.id);
          }
        }
        
        // Similarly for sub-districts and neighborhoods
        if (assignment.governorate && assignment.subDistrict?.id) {
          if (!scope.subDistrictIds.includes(assignment.subDistrict.id)) {
            scope.subDistrictIds.push(assignment.subDistrict.id);
          }
        }
        
        if (assignment.governorate && assignment.neighborhood?.id) {
          if (!scope.neighborhoodIds.includes(assignment.neighborhood.id)) {
            scope.neighborhoodIds.push(assignment.neighborhood.id);
          }
        }
      }
      
      // Direct district access (without governorate access)
      if (assignment.districtId && !assignment.governorateId) {
        if (!scope.districtIds.includes(assignment.districtId)) {
          scope.districtIds.push(assignment.districtId);
          if (mostSpecificLevel === 'none' || mostSpecificLevel === 'governorate') mostSpecificLevel = 'district';
        }
        
        // District access grants access to sub-districts and neighborhoods within it
        if (assignment.district && assignment.subDistrict?.id) {
          if (!scope.subDistrictIds.includes(assignment.subDistrict.id)) {
            scope.subDistrictIds.push(assignment.subDistrict.id);
          }
        }
        
        if (assignment.district && assignment.neighborhood?.id) {
          if (!scope.neighborhoodIds.includes(assignment.neighborhood.id)) {
            scope.neighborhoodIds.push(assignment.neighborhood.id);
          }
        }
      }
      
      // Direct sub-district access (without higher level access)
      if (assignment.subDistrictId && !assignment.districtId && !assignment.governorateId) {
        if (!scope.subDistrictIds.includes(assignment.subDistrictId)) {
          scope.subDistrictIds.push(assignment.subDistrictId);
          if (mostSpecificLevel === 'none' || mostSpecificLevel === 'governorate' || mostSpecificLevel === 'district') {
            mostSpecificLevel = 'subDistrict';
          }
        }
        
        // Sub-district access grants access to neighborhoods within it
        if (assignment.subDistrict && assignment.neighborhood?.id) {
          if (!scope.neighborhoodIds.includes(assignment.neighborhood.id)) {
            scope.neighborhoodIds.push(assignment.neighborhood.id);
          }
        }
      }
      
      // Direct neighborhood access (without higher level access)
      if (assignment.neighborhoodId && !assignment.subDistrictId && !assignment.districtId && !assignment.governorateId) {
        if (!scope.neighborhoodIds.includes(assignment.neighborhoodId)) {
          scope.neighborhoodIds.push(assignment.neighborhoodId);
          mostSpecificLevel = 'neighborhood';
        }
      }
    });

    scope.mostSpecificLevel = mostSpecificLevel as UserGeographicScope['mostSpecificLevel'];
    return scope;
  };

  const canAccessGovernorate = (governorateId: string): boolean => {
    // Admins have full access
    if (user?.role === 'admin') return true;
    
    const scope = getUserGeographicScope();
    if (!scope) return false;
    
    // Direct governorate access
    return scope.governorateIds.includes(governorateId);
  };

  const canAccessDistrict = (districtId: string): boolean => {
    if (user?.role === 'admin') return true;
    
    const scope = getUserGeographicScope();
    if (!scope) return false;
    
    // FIXED: Use hierarchical scope expansion - simple check
    return scope.districtIds.includes(districtId);
  };

  const canAccessSubDistrict = (subDistrictId: string): boolean => {
    if (user?.role === 'admin') return true;
    
    const scope = getUserGeographicScope();
    if (!scope) return false;
    
    // FIXED: Use hierarchical scope expansion - simple check
    return scope.subDistrictIds.includes(subDistrictId);
  };

  const canAccessNeighborhood = (neighborhoodId: string): boolean => {
    if (user?.role === 'admin') return true;
    
    const scope = getUserGeographicScope();
    if (!scope) return false;
    
    // FIXED: Use hierarchical scope expansion - simple check
    return scope.neighborhoodIds.includes(neighborhoodId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isLoading,
        // LBAC Helper Functions
        getUserGeographicScope,
        canAccessGovernorate,
        canAccessDistrict,
        canAccessSubDistrict,
        canAccessNeighborhood,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}