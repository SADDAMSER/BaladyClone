import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  Map, 
  FileText, 
  Users, 
  Settings, 
  Clock,
  DollarSign,
  Search,
  Filter,
  Grid3X3,
  List,
  User,
  Building2,
  Briefcase
} from "lucide-react";

interface ServiceCardData {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  category: string;
  type: string;
  processingTimeEstimate?: number;
  fees?: string;
  targetAudience: string[];
  icon: string;
  color: string;
  isActive: boolean;
}

// Mock data until backend is ready
const mockServices: ServiceCardData[] = [
  {
    id: "1",
    name: "إصدار رخصة بناء",
    nameEn: "Building License Issuance", 
    description: "خدمة إصدار تراخيص البناء للمشاريع السكنية والتجارية والصناعية",
    category: "building_permits",
    type: "building_license",
    processingTimeEstimate: 7,
    fees: "500.00",
    targetAudience: ["individuals", "companies"],
    icon: "Building",
    color: "#3b82f6",
    isActive: true
  },
  {
    id: "2", 
    name: "إصدار قرار مساحي",
    nameEn: "Surveying Decision",
    description: "خدمة إصدار القرارات المساحية وتحديد الحدود والإحداثيات",
    category: "surveying",
    type: "surveying_decision", 
    processingTimeEstimate: 3,
    fees: "200.00",
    targetAudience: ["individuals", "companies", "organizations"],
    icon: "Map",
    color: "#10b981",
    isActive: true
  },
  {
    id: "3",
    name: "إصدار شهادة إشغال",
    nameEn: "Occupancy Certificate",
    description: "خدمة إصدار شهادات الإشغال للمباني المكتملة",
    category: "certificates",
    type: "occupancy_certificate",
    processingTimeEstimate: 5,
    fees: "150.00", 
    targetAudience: ["individuals", "companies"],
    icon: "FileText",
    color: "#f59e0b",
    isActive: true
  },
  {
    id: "4",
    name: "إضافة مفوض عن منشأة",
    nameEn: "Add Facility Delegate",
    description: "خدمة تفويض شخص للتعامل نيابة عن المنشأة في الإجراءات الحكومية",
    category: "delegation",
    type: "facility_delegate",
    processingTimeEstimate: 1,
    fees: "50.00",
    targetAudience: ["companies", "organizations"],
    icon: "Users", 
    color: "#8b5cf6",
    isActive: true
  },
  {
    id: "5",
    name: "إصدار رخصة هدم بناء",
    nameEn: "Building Demolition License",
    description: "خدمة إصدار تراخيص هدم المباني والمنشآت", 
    category: "building_permits",
    type: "demolition_license",
    processingTimeEstimate: 5,
    fees: "300.00",
    targetAudience: ["individuals", "companies"],
    icon: "Settings",
    color: "#ef4444",
    isActive: true
  },
  {
    id: "6",
    name: "تجديد رخصة البناء",
    nameEn: "Building License Renewal",
    description: "خدمة تجديد تراخيص البناء المنتهية الصلاحية",
    category: "building_permits", 
    type: "license_renewal",
    processingTimeEstimate: 3,
    fees: "100.00",
    targetAudience: ["individuals", "companies"],
    icon: "Building2",
    color: "#06b6d4",
    isActive: true
  }
];

const iconComponents = {
  Building: Building,
  Map: Map,
  FileText: FileText,
  Users: Users,
  Settings: Settings,
  Building2: Building2
};

const targetAudienceLabels = {
  individuals: { label: "أفراد", icon: User, color: "#3b82f6" },
  companies: { label: "شركات", icon: Briefcase, color: "#10b981" },
  organizations: { label: "مؤسسات", icon: Building2, color: "#f59e0b" }
};

export default function ServiceCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAudience, setSelectedAudience] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // This will be replaced with real API call
  const { data: services = mockServices, isLoading } = useQuery({
    queryKey: ["/api/services"],
    // For now using mock data
    queryFn: () => Promise.resolve(mockServices)
  });

  // Filter services based on search and filters
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (service.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesCategory = selectedCategory === "all" || service.category === selectedCategory;
    const matchesAudience = selectedAudience === "all" || service.targetAudience.includes(selectedAudience);
    
    return matchesSearch && matchesCategory && matchesAudience && service.isActive;
  });

  // Group services by category for display
  const categories = Array.from(new Set(services.map(s => s.category)));
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconComponents[iconName as keyof typeof iconComponents] || FileText;
    return IconComponent;
  };

  const ServiceCard = ({ service }: { service: ServiceCardData }) => {
    const IconComponent = getIconComponent(service.icon);
    
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm hover:scale-[1.02]" data-testid={`service-card-${service.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${service.color}15`, color: service.color }}
              >
                <IconComponent className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                  {service.name}
                </CardTitle>
                {service.nameEn && (
                  <p className="text-sm text-muted-foreground font-medium">{service.nameEn}</p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-4">
          <CardDescription className="text-sm leading-relaxed">
            {service.description}
          </CardDescription>
          
          {/* Target Audience Badges */}
          <div className="flex flex-wrap gap-2">
            {service.targetAudience.map((audience) => {
              const audienceData = targetAudienceLabels[audience as keyof typeof targetAudienceLabels];
              const AudienceIcon = audienceData.icon;
              return (
                <Badge 
                  key={audience} 
                  variant="secondary" 
                  className="text-xs"
                  style={{ backgroundColor: `${audienceData.color}15`, color: audienceData.color }}
                >
                  <AudienceIcon className="h-3 w-3 ml-1" />
                  {audienceData.label}
                </Badge>
              );
            })}
          </div>
          
          {/* Service Details */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
            <div className="flex items-center space-x-1 space-x-reverse">
              <Clock className="h-4 w-4" />
              <span>{service.processingTimeEstimate || "غير محدد"} أيام</span>
            </div>
            {service.fees && (
              <div className="flex items-center space-x-1 space-x-reverse">
                <DollarSign className="h-4 w-4" />
                <span>{service.fees} ريال</span>
              </div>
            )}
          </div>
          
          {/* Action Button */}
          <Link href={`/services/${service.id}/apply`}>
            <Button 
              className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              data-testid={`button-start-service-${service.id}`}
            >
              بدء الخدمة
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl" data-testid="service-catalog">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">دليل الخدمات</h1>
        <p className="text-lg text-muted-foreground">
          استعرض جميع الخدمات الإلكترونية المتاحة وابدأ بتقديم طلبك بسهولة
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg border p-6 mb-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن الخدمة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              data-testid="input-search-services"
            />
          </div>
          
          {/* Category Filter */}
          <div>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              data-testid="select-category-filter"
            >
              <option value="all">جميع الفئات</option>
              <option value="building_permits">تراخيص البناء</option>
              <option value="surveying">الخدمات المساحية</option>
              <option value="certificates">الشهادات</option>
              <option value="delegation">التفويض</option>
            </select>
          </div>
          
          {/* Audience Filter */}
          <div className="flex items-center gap-2">
            <select 
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value)}
              className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
              data-testid="select-audience-filter"
            >
              <option value="all">جميع الفئات المستهدفة</option>
              <option value="individuals">أفراد</option>
              <option value="companies">شركات</option>
              <option value="organizations">مؤسسات</option>
            </select>
            
            {/* View Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2 space-x-reverse text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>عدد الخدمات: {filteredServices.length}</span>
        </div>
      </div>

      {/* Services Grid/List */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">لا توجد خدمات مطابقة</h3>
          <p className="text-muted-foreground mb-4">جرب تغيير معايير البحث أو الفلترة</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedAudience("all");
            }}
            data-testid="button-clear-filters"
          >
            مسح الفلاتر
          </Button>
        </div>
      ) : (
        <div className={cn(
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
        )}>
          {filteredServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}