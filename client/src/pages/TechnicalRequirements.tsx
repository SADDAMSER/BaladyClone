import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cog, Search, Plus, Shield, Building2, MapPin, Heart, Wrench } from "lucide-react";

export default function TechnicalRequirements() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/requirement-categories"],
  });

  const { data: requirements, isLoading: requirementsLoading } = useQuery({
    queryKey: ["/api/requirements"],
  });

  const mockCategories = [
    {
      id: "1",
      name: "اشتراطات الأمن والسلامة",
      description: "متطلبات الحماية من الحرائق ومخارج الطوارئ",
      icon: "fas fa-shield-alt",
      color: "primary",
      requirementsCount: 15
    },
    {
      id: "2", 
      name: "اشتراطات التصميم والمخططات",
      description: "معايير التصميم المعماري والإنشائي",
      icon: "fas fa-drafting-compass",
      color: "secondary",
      requirementsCount: 22
    },
    {
      id: "3",
      name: "اشتراطات الموقع",
      description: "متطلبات موقع البناء والمساحات",
      icon: "fas fa-map-marker-alt",
      color: "accent",
      requirementsCount: 18
    },
    {
      id: "4",
      name: "اشتراطات صحية",
      description: "أنظمة الصرف الصحي والتهوية",
      icon: "fas fa-heartbeat",
      color: "primary",
      requirementsCount: 12
    },
    {
      id: "5",
      name: "اشتراطات فنية",
      description: "المواصفات الفنية للمواد والتنفيذ",
      icon: "fas fa-wrench",
      color: "secondary",
      requirementsCount: 28
    }
  ];

  const mockRequirements = [
    {
      id: "1",
      title: "مخارج الطوارئ",
      description: "يجب توفير مخرجين للطوارئ على الأقل في كل طابق",
      category: "اشتراطات الأمن والسلامة",
      priority: "high",
      isConditional: false,
      specifications: {
        minWidth: "1.2 متر",
        maxDistance: "30 متر من أي نقطة",
        lighting: "إضاءة طوارئ مطلوبة"
      }
    },
    {
      id: "2",
      title: "نظام إطفاء الحريق",
      description: "تركيب نظام إطفاء تلقائي في المباني التي تزيد عن 3 طوابق",
      category: "اشتراطات الأمن والسلامة", 
      priority: "high",
      isConditional: true,
      specifications: {
        coverage: "جميع الغرف والممرات",
        pressure: "8-12 بار",
        capacity: "حسب مساحة المبنى"
      }
    }
  ];

  const displayCategories = (Array.isArray(categories) ? categories : mockCategories);
  const displayRequirements = (Array.isArray(requirements) ? requirements : mockRequirements);

  const priorityColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800"
  };

  const priorityLabels = {
    high: "عالية",
    medium: "متوسطة", 
    low: "منخفضة"
  };

  const iconMap = {
    "fas fa-shield-alt": Shield,
    "fas fa-drafting-compass": Building2,
    "fas fa-map-marker-alt": MapPin,
    "fas fa-heartbeat": Heart,
    "fas fa-wrench": Wrench
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
              <Cog className="text-accent" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-cairo">الاشتراطات الفنية</h1>
              <p className="text-muted-foreground">دليل الاشتراطات والمتطلبات الفنية الذكي</p>
            </div>
          </div>
          <Button 
            className="flex items-center space-x-2 space-x-reverse"
            data-testid="button-new-requirement"
          >
            <Plus size={16} />
            <span>اشتراط جديد</span>
          </Button>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories" data-testid="tab-categories">فئات الاشتراطات</TabsTrigger>
            <TabsTrigger value="requirements" data-testid="tab-requirements">جميع الاشتراطات</TabsTrigger>
            <TabsTrigger value="smart-guide" data-testid="tab-smart-guide">الدليل الذكي</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="ابحث في الاشتراطات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                    data-testid="input-search-requirements"
                  />
                  <Button variant="outline" data-testid="button-search-requirements">
                    <Search size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayCategories.map((category: any) => {
                const IconComponent = iconMap[category.icon as keyof typeof iconMap] || Cog;
                return (
                  <Card 
                    key={category.id} 
                    className="service-card cursor-pointer"
                    data-testid={`category-card-${category.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4 space-x-reverse mb-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${category.color}/20`}>
                          <IconComponent className={`text-${category.color}`} size={24} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{category.name}</h4>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge 
                          className={`text-xs px-2 py-1 rounded-full bg-${category.color}/10 text-${category.color}`}
                          data-testid={`category-badge-${category.id}`}
                        >
                          {category.requirementsCount} اشتراط
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="requirements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">جميع الاشتراطات الفنية</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-4" data-testid="requirements-accordion">
                  {displayRequirements.map((requirement: any) => (
                    <AccordionItem key={requirement.id} value={requirement.id}>
                      <AccordionTrigger className="text-right">
                        <div className="flex items-center space-x-4 space-x-reverse w-full">
                          <div className="flex-1 text-right">
                            <h4 className="font-semibold">{requirement.title}</h4>
                            <p className="text-sm text-muted-foreground">{requirement.category}</p>
                          </div>
                          <div className="flex space-x-2 space-x-reverse">
                            <Badge 
                              className={priorityColors[requirement.priority as keyof typeof priorityColors]}
                              data-testid={`priority-${requirement.id}`}
                            >
                              {priorityLabels[requirement.priority as keyof typeof priorityLabels]}
                            </Badge>
                            {requirement.isConditional && (
                              <Badge variant="outline" data-testid={`conditional-${requirement.id}`}>
                                مشروط
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                          <p className="text-foreground">{requirement.description}</p>
                          {requirement.specifications && (
                            <div>
                              <h5 className="font-medium text-foreground mb-2">المواصفات الفنية:</h5>
                              <div className="space-y-2">
                                {Object.entries(requirement.specifications).map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="text-foreground">{value as string}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="smart-guide" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">الدليل الذكي للاشتراطات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-8 text-center" data-testid="smart-guide-placeholder">
                  <Cog className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">الدليل التفاعلي الذكي</h3>
                  <p className="text-muted-foreground">
                    سيتم تطوير دليل تفاعلي ذكي يساعد في اختيار الاشتراطات المناسبة حسب نوع المشروع والموقع
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
