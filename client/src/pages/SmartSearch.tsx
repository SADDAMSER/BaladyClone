import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter,
  Clock,
  FileText,
  Users,
  Building2,
  Scale,
  Sparkles,
  History,
  BookOpen,
  Target,
  Zap,
  Brain,
  Eye,
  Download,
  Star,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'application' | 'user' | 'department' | 'law' | 'service';
  category: string;
  relevanceScore: number;
  lastModified: Date;
  createdBy: string;
  tags: string[];
  highlights: string[];
  url: string;
  metadata: {
    fileSize?: number;
    department?: string;
    status?: string;
    priority?: string;
  };
}

interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'smart';
  count?: number;
}

export default function SmartSearch() {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSort, setSelectedSort] = useState('relevance');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Mock data for demonstration
  const mockSuggestions: SearchSuggestion[] = [
    { text: 'ترخيص بناء سكني', type: 'popular', count: 45 },
    { text: 'قرار مساحي', type: 'popular', count: 32 },
    { text: 'لائحة البناء 2024', type: 'recent' },
    { text: 'تقرير الأداء الشهري', type: 'recent' },
    { text: 'اشتراطات فنية', type: 'smart', count: 28 }
  ];

  const mockResults: SearchResult[] = [
    {
      id: '1',
      title: 'لائحة تراخيص البناء السكني 2024',
      content: 'اللائحة المحدثة للتراخيص السكنية تتضمن جميع الإجراءات والمتطلبات اللازمة لاستخراج تراخيص البناء...',
      type: 'document',
      category: 'لوائح وقوانين',
      relevanceScore: 0.95,
      lastModified: new Date('2024-01-15'),
      createdBy: 'أحمد المدير',
      tags: ['تراخيص', 'بناء', 'سكني', '2024'],
      highlights: ['تراخيص البناء السكني', 'المتطلبات اللازمة', 'الإجراءات المحدثة'],
      url: '/documents/building-licenses-2024',
      metadata: {
        fileSize: 2450000,
        department: 'التراخيص',
        status: 'معتمد'
      }
    },
    {
      id: '2',
      title: 'خدمة استخراج ترخيص بناء سكني',
      content: 'خدمة إلكترونية متطورة لاستخراج تراخيص البناء السكني بطريقة سهلة وسريعة عبر المنصة الرقمية...',
      type: 'service',
      category: 'خدمات إلكترونية',
      relevanceScore: 0.88,
      lastModified: new Date('2024-01-20'),
      createdBy: 'فاطمة المطورة',
      tags: ['خدمة', 'ترخيص', 'إلكتروني', 'سريع'],
      highlights: ['ترخيص بناء سكني', 'خدمة إلكترونية', 'المنصة الرقمية'],
      url: '/services/residential-building-license',
      metadata: {
        department: 'التراخيص',
        status: 'فعال',
        priority: 'عالية'
      }
    },
    {
      id: '3',
      title: 'طلب ترخيص بناء - أحمد محمد علي',
      content: 'طلب ترخيص بناء منزل سكني في حي الصافية، صنعاء. المساحة: 200 متر مربع، عدد الطوابق: دورين...',
      type: 'application',
      category: 'طلبات المواطنين',
      relevanceScore: 0.76,
      lastModified: new Date('2024-02-01'),
      createdBy: 'أحمد محمد علي',
      tags: ['طلب', 'ترخيص', 'منزل', 'صنعاء'],
      highlights: ['ترخيص بناء', 'منزل سكني', 'الصافية'],
      url: '/applications/123456',
      metadata: {
        department: 'التراخيص',
        status: 'قيد المراجعة',
        priority: 'متوسطة'
      }
    }
  ];

  // Simulate search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length > 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedFilter, selectedSort]);

  const performSearch = async () => {
    setIsSearching(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Filter and sort results based on criteria
    let filteredResults = mockResults;
    
    if (selectedFilter !== 'all') {
      filteredResults = mockResults.filter(result => result.type === selectedFilter);
    }
    
    // Sort results
    filteredResults.sort((a, b) => {
      switch (selectedSort) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'date':
          return b.lastModified.getTime() - a.lastModified.getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title, 'ar');
        default:
          return 0;
      }
    });
    
    setSearchResults(filteredResults);
    setIsSearching(false);
    
    // Add to search history
    if (query && !searchHistory.includes(query)) {
      setSearchHistory(prev => [query, ...prev.slice(0, 4)]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'document': return <FileText className="w-4 h-4" />;
      case 'application': return <Target className="w-4 h-4" />;
      case 'user': return <Users className="w-4 h-4" />;
      case 'department': return <Building2 className="w-4 h-4" />;
      case 'law': return <Scale className="w-4 h-4" />;
      case 'service': return <Zap className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeText = (type: SearchResult['type']) => {
    switch (type) {
      case 'document': return 'مستند';
      case 'application': return 'طلب';
      case 'user': return 'مستخدم';
      case 'department': return 'قسم';
      case 'law': return 'قانون';
      case 'service': return 'خدمة';
      default: return 'غير محدد';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'معتمد': case 'فعال': return 'bg-green-100 text-green-800';
      case 'قيد المراجعة': return 'bg-yellow-100 text-yellow-800';
      case 'مرفوض': case 'معطل': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const highlightText = (text: string, highlights: string[]) => {
    let highlightedText = text;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    });
    return highlightedText;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">البحث الذكي والفهرسة</h1>
          </div>
          <p className="text-gray-600">ابحث في جميع المحتويات باستخدام الذكاء الاصطناعي</p>
        </div>

        {/* Search Box */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="relative">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      ref={searchInputRef}
                      placeholder="ابحث في المستندات، الطلبات، الخدمات، والمزيد..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      className="pr-12 py-6 text-lg border-2 focus:border-blue-500"
                      data-testid="smart-search-input"
                    />
                    
                    {/* Search Suggestions */}
                    {showSuggestions && query.length === 0 && (
                      <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <h3 className="font-medium text-sm text-gray-700">اقتراحات البحث</h3>
                            
                            {/* Recent Searches */}
                            {searchHistory.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                  <History className="w-3 h-3" />
                                  عمليات بحث حديثة
                                </p>
                                <div className="space-y-1">
                                  {searchHistory.map((search, index) => (
                                    <button
                                      key={index}
                                      className="block w-full text-right p-2 hover:bg-gray-50 rounded text-sm"
                                      onClick={() => handleSuggestionClick(search)}
                                    >
                                      {search}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Popular Suggestions */}
                            <div>
                              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                عمليات بحث شائعة
                              </p>
                              <div className="space-y-1">
                                {mockSuggestions.filter(s => s.type === 'popular').map((suggestion, index) => (
                                  <button
                                    key={index}
                                    className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded text-sm"
                                    onClick={() => handleSuggestionClick(suggestion.text)}
                                  >
                                    <span>{suggestion.text}</span>
                                    {suggestion.count && (
                                      <Badge variant="outline" className="text-xs">
                                        {suggestion.count}
                                      </Badge>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  
                  <Button 
                    size="lg" 
                    onClick={performSearch}
                    disabled={isSearching}
                    data-testid="search-button"
                  >
                    {isSearching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Sorting */}
        <div className="max-w-4xl mx-auto mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">الفلتر:</span>
                </div>
                
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع النتائج</SelectItem>
                    <SelectItem value="document">المستندات</SelectItem>
                    <SelectItem value="application">الطلبات</SelectItem>
                    <SelectItem value="service">الخدمات</SelectItem>
                    <SelectItem value="user">المستخدمين</SelectItem>
                    <SelectItem value="law">القوانين</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2 mr-8">
                  <span className="text-sm text-gray-700">ترتيب:</span>
                  <Select value={selectedSort} onValueChange={setSelectedSort}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">الأكثر صلة</SelectItem>
                      <SelectItem value="date">الأحدث</SelectItem>
                      <SelectItem value="alphabetical">أبجدياً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mr-auto">
                    <Badge className="bg-blue-100 text-blue-800">
                      {searchResults.length} نتيجة
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Results */}
        <div className="max-w-4xl mx-auto">
          {query.length > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              نتائج البحث عن: "<span className="font-bold">{query}</span>"
            </div>
          )}

          {isSearching && (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-4">
              {searchResults.map((result) => (
                <Card 
                  key={result.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => window.location.href = result.url}
                  data-testid={`search-result-${result.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                        {getTypeIcon(result.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 
                            className="font-bold text-lg text-blue-700 hover:text-blue-800"
                            dangerouslySetInnerHTML={{ __html: highlightText(result.title, result.highlights) }}
                          />
                          <div className="flex items-center gap-2 mr-4">
                            <Badge variant="outline" className="text-xs">
                              {getTypeText(result.type)}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs text-gray-600">
                                {Math.round(result.relevanceScore * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <p 
                          className="text-gray-700 mb-3 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: highlightText(result.content, result.highlights) }}
                        />
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {result.createdBy}
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {result.lastModified.toLocaleDateString('ar-SA')}
                          </span>
                          
                          {result.metadata.department && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {result.metadata.department}
                            </span>
                          )}
                          
                          {result.metadata.status && (
                            <Badge className={getStatusColor(result.metadata.status)}>
                              {result.metadata.status}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          {result.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isSearching && query.length > 2 && searchResults.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
                <p className="text-gray-500 mb-6">
                  لم نجد أي نتائج مطابقة لبحثك. جرب استخدام كلمات مختلفة أو أقل تحديداً
                </p>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-2">اقتراحات للبحث:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {mockSuggestions.slice(0, 3).map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion.text)}
                      >
                        {suggestion.text}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {query.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="font-bold text-lg mb-2">بحث ذكي</h3>
                  <p className="text-gray-600 text-sm">
                    استخدم الذكاء الاصطناعي للعثور على المحتوى المناسب
                  </p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-green-600 mb-4" />
                  <h3 className="font-bold text-lg mb-2">فهرسة شاملة</h3>
                  <p className="text-gray-600 text-sm">
                    جميع المحتويات مفهرسة ومنظمة للبحث السريع
                  </p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Target className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                  <h3 className="font-bold text-lg mb-2">نتائج دقيقة</h3>
                  <p className="text-gray-600 text-sm">
                    نتائج بحث مرتبة حسب الصلة والأهمية
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}