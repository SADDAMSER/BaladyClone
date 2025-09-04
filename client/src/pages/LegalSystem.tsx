import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, Search, Plus, BookOpen, FileText, Gavel } from "lucide-react";

export default function LegalSystem() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: laws, isLoading: lawsLoading } = useQuery({
    queryKey: ["/api/laws"],
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/search/articles", searchQuery],
    enabled: searchQuery.length > 2,
  });

  const mockLaws = [
    {
      id: "1",
      title: "قانون البناء اليمني",
      type: "قانون",
      status: "نشط",
      effectiveDate: "2010-01-01",
      sectionsCount: 8,
      articlesCount: 47,
      description: "القانون الأساسي المنظم لأعمال البناء والتشييد في الجمهورية اليمنية"
    },
    {
      id: "2",
      title: "اللائحة التنفيذية لقانون البناء",
      type: "لائحة تنفيذية", 
      status: "نشط",
      effectiveDate: "2011-06-15",
      sectionsCount: 12,
      articlesCount: 89,
      description: "اللائحة المفصلة لتطبيق أحكام قانون البناء اليمني"
    },
    {
      id: "3",
      title: "الهيكل التنظيمي ولائحة المكتب",
      type: "لائحة تنظيمية",
      status: "نشط", 
      effectiveDate: "2015-03-20",
      sectionsCount: 5,
      articlesCount: 35,
      description: "تنظيم هيكل وصلاحيات مكتب الأشغال العامة والطرق"
    }
  ];

  const mockArticles = [
    {
      id: "1",
      articleNumber: "المادة 12",
      articleText: "يجب الحصول على ترخيص من الجهة المختصة قبل البدء في أعمال البناء أو التعلية أو التوسعة",
      lawTitle: "قانون البناء اليمني",
      sectionTitle: "التراخيص والموافقات"
    },
    {
      id: "2", 
      articleNumber: "المادة 25",
      articleText: "يلتزم المالك بتنفيذ البناء وفقاً للمخططات المعتمدة والاشتراطات الفنية المحددة",
      lawTitle: "قانون البناء اليمني",
      sectionTitle: "التنفيذ والإشراف"
    }
  ];

  const typeColors = {
    "قانون": "bg-primary/10 text-primary",
    "لائحة تنفيذية": "bg-secondary/10 text-secondary",
    "لائحة تنظيمية": "bg-accent/10 text-accent",
    "دليل": "bg-muted text-muted-foreground"
  };

  const displayLaws = (Array.isArray(laws) ? laws : mockLaws);
  const displayArticles = (Array.isArray(searchResults) ? searchResults : mockArticles);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <Scale className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-cairo">النظام القانوني</h1>
              <p className="text-muted-foreground">محرك قوانين البناء الذكي والبحث القانوني</p>
            </div>
          </div>
          <Button 
            className="flex items-center space-x-2 space-x-reverse"
            data-testid="button-new-law"
          >
            <Plus size={16} />
            <span>إضافة قانون</span>
          </Button>
        </div>

        <Tabs defaultValue="laws" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="laws" data-testid="tab-laws">القوانين واللوائح</TabsTrigger>
            <TabsTrigger value="search" data-testid="tab-search">البحث القانوني</TabsTrigger>
            <TabsTrigger value="ai-engine" data-testid="tab-ai-engine">محرك الذكاء الاصطناعي</TabsTrigger>
          </TabsList>

          <TabsContent value="laws" className="space-y-6">
            {/* Laws and Regulations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayLaws.map((law: any) => (
                <Card key={law.id} className="service-card cursor-pointer" data-testid={`law-card-${law.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-cairo mb-2">{law.title}</CardTitle>
                        <div className="flex space-x-2 space-x-reverse">
                          <Badge className={typeColors[law.type as keyof typeof typeColors]}>
                            {law.type}
                          </Badge>
                          <Badge variant={law.status === "نشط" ? "default" : "secondary"}>
                            {law.status}
                          </Badge>
                        </div>
                      </div>
                      <BookOpen className="text-muted-foreground" size={20} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4">{law.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">تاريخ السريان:</span>
                        <span className="text-foreground">{law.effectiveDate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">الفصول:</span>
                        <span className="text-primary">{law.sectionsCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">المواد:</span>
                        <span className="text-secondary">{law.articlesCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            {/* Advanced Legal Search */}
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">البحث القانوني المتقدم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      placeholder="ابحث في نصوص القوانين والمواد..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                      data-testid="input-legal-search"
                    />
                    <Button data-testid="button-legal-search">
                      <Search size={16} />
                      بحث
                    </Button>
                  </div>
                  
                  {searchQuery.length > 2 && (
                    <div className="space-y-4" data-testid="search-results">
                      <h4 className="font-semibold text-foreground">نتائج البحث ({displayArticles.length})</h4>
                      <div className="space-y-3">
                        {displayArticles.map((article: any) => (
                          <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-4 space-x-reverse">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <FileText className="text-primary" size={16} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                                    <h5 className="font-medium text-foreground">{article.articleNumber}</h5>
                                    <Badge variant="outline" className="text-xs">
                                      {article.lawTitle}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-foreground">{article.articleText}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{article.sectionTitle}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-engine" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">محرك الذكاء الاصطناعي القانوني</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">إحصائيات المحرك</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                        <span className="text-muted-foreground">القوانين المحللة</span>
                        <span className="font-medium text-primary">5 قوانين</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary/5 rounded-lg">
                        <span className="text-muted-foreground">المواد المفهرسة</span>
                        <span className="font-medium text-secondary">144 مادة</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                        <span className="text-muted-foreground">دقة البحث</span>
                        <span className="font-medium text-accent">95.2%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">اختبار المحرك</h4>
                    <div className="space-y-3">
                      <Input 
                        placeholder="اسأل أي سؤال قانوني..." 
                        className="w-full"
                        data-testid="input-ai-query"
                      />
                      <Button className="w-full" data-testid="button-ai-search">
                        <Gavel className="ml-2" size={16} />
                        استشارة قانونية ذكية
                      </Button>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground text-center">
                        سيتم عرض النتائج والاستشارة القانونية الذكية هنا
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
