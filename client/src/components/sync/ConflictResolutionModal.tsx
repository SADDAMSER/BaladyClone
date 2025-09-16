import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/auth/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, X, Merge } from 'lucide-react';

interface SyncConflict {
  id: string;
  tableName: string;
  recordId: string;
  fieldName?: string;
  serverValue: any;
  clientValue: any;
  conflictType: string;
  createdAt: string;
}

interface ConflictResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
}

export function ConflictResolutionModal({ open, onOpenChange, sessionId }: ConflictResolutionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedResolutions, setSelectedResolutions] = useState<Record<string, { strategy: string; resolvedData?: any }>>({});

  // Get unresolved conflicts
  const { data: conflicts = [], isLoading } = useQuery<SyncConflict[]>({
    queryKey: ['/api/sync/conflicts', sessionId],
    enabled: open && !!sessionId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Resolve conflicts mutation
  const resolveConflictsMutation = useMutation({
    mutationFn: async (resolutions: Array<{ conflictId: string; strategy: string; resolvedData?: any }>) => {
      const response = await apiRequest('/api/sync/resolve-conflicts', 'POST', {
        sessionId,
        resolutions
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم حل التعارضات بنجاح",
        description: `تم حل ${data.resolved || 0} تعارض`,
        variant: "default",
      });
      
      // Refresh conflicts and close modal
      queryClient.invalidateQueries({ queryKey: ['/api/sync/conflicts'] });
      setSelectedResolutions({});
      
      if (data.resolved > 0) {
        onOpenChange(false);
      }
    },
    onError: (error) => {
      console.error('Conflict resolution failed:', error);
      toast({
        title: "فشل في حل التعارضات",
        description: "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  });

  const handleResolutionSelect = (conflictId: string, strategy: string, resolvedData?: any) => {
    setSelectedResolutions(prev => ({
      ...prev,
      [conflictId]: { strategy, resolvedData }
    }));
  };

  const handleResolveAll = () => {
    const resolutions = conflicts
      .filter(conflict => selectedResolutions[conflict.id])
      .map(conflict => ({
        conflictId: conflict.id,
        strategy: selectedResolutions[conflict.id].strategy,
        resolvedData: selectedResolutions[conflict.id].resolvedData
      }));

    if (resolutions.length === 0) {
      toast({
        title: "لا توجد تعارضات محددة",
        description: "يرجى اختيار استراتيجية لحل التعارضات أولاً",
        variant: "destructive",
      });
      return;
    }

    resolveConflictsMutation.mutate(resolutions);
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'concurrent_update': return 'تحديث متزامن';
      case 'deleted_on_server': return 'محذوف من الخادم';
      case 'validation_error': return 'خطأ في التحقق';
      default: return type;
    }
  };

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case 'use_local': return 'استخدام البيانات المحلية';
      case 'use_remote': return 'استخدام بيانات الخادم';
      case 'merge': return 'دمج البيانات';
      default: return strategy;
    }
  };

  const renderValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">لا يوجد</span>;
    }
    if (typeof value === 'object') {
      return <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{JSON.stringify(value, null, 2)}</pre>;
    }
    return String(value);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              تحميل التعارضات...
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">جاري تحميل التعارضات...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              لا توجد تعارضات
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center text-gray-600">
            جميع البيانات متزامنة بنجاح!
          </div>
          <Button onClick={() => onOpenChange(false)}>إغلاق</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            حل تعارضات المزامنة ({conflicts.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <Card key={conflict.id} className="border-2 border-yellow-200 dark:border-yellow-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{conflict.tableName}</span>
                    {conflict.fieldName && (
                      <Badge variant="outline">الحقل: {conflict.fieldName}</Badge>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {getConflictTypeLabel(conflict.conflictType)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400">
                      البيانات المحلية:
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded border">
                      {renderValue(conflict.clientValue)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-green-600 dark:text-green-400">
                      بيانات الخادم:
                    </h4>
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded border">
                      {renderValue(conflict.serverValue)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant={selectedResolutions[conflict.id]?.strategy === 'use_local' ? 'default' : 'outline'}
                    onClick={() => handleResolutionSelect(conflict.id, 'use_local', conflict.clientValue)}
                    className="flex items-center gap-1"
                    data-testid={`button-use-local-${conflict.id}`}
                  >
                    <Check className="h-4 w-4" />
                    استخدام المحلية
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={selectedResolutions[conflict.id]?.strategy === 'use_remote' ? 'default' : 'outline'}
                    onClick={() => handleResolutionSelect(conflict.id, 'use_remote', conflict.serverValue)}
                    className="flex items-center gap-1"
                    data-testid={`button-use-remote-${conflict.id}`}
                  >
                    <X className="h-4 w-4" />
                    استخدام الخادم
                  </Button>
                  
                  {conflict.conflictType === 'concurrent_update' && (
                    <Button
                      size="sm"
                      variant={selectedResolutions[conflict.id]?.strategy === 'merge' ? 'default' : 'outline'}
                      onClick={() => handleResolutionSelect(conflict.id, 'merge', { ...conflict.serverValue, ...conflict.clientValue })}
                      className="flex items-center gap-1"
                      data-testid={`button-merge-${conflict.id}`}
                    >
                      <Merge className="h-4 w-4" />
                      دمج البيانات
                    </Button>
                  )}
                </div>

                {selectedResolutions[conflict.id] && (
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      الاستراتيجية المختارة: {getStrategyLabel(selectedResolutions[conflict.id].strategy)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            تم اختيار {Object.keys(selectedResolutions).length} من {conflicts.length} تعارض
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleResolveAll}
              disabled={Object.keys(selectedResolutions).length === 0 || resolveConflictsMutation.isPending}
              data-testid="button-resolve-all"
            >
              {resolveConflictsMutation.isPending ? 'جاري الحل...' : 'حل جميع التعارضات'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictResolutionModal;