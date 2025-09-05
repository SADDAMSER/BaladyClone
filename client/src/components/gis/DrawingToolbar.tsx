import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Hand,
  MapPin,
  Route,
  Square,
  Circle,
  Shapes,
  Trash2,
  Download,
  Upload
} from 'lucide-react';

export type DrawingMode = 'pan' | 'point' | 'line' | 'polygon' | 'rectangle' | 'circle';

interface DrawingToolbarProps {
  currentMode: DrawingMode;
  onModeChange: (mode: DrawingMode) => void;
  onClear?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  isEnabled?: boolean;
}

const tools = [
  {
    id: 'pan' as DrawingMode,
    label: 'تحريك',
    icon: Hand,
    description: 'تحريك وتكبير الخريطة'
  },
  {
    id: 'point' as DrawingMode,
    label: 'نقطة',
    icon: MapPin,
    description: 'إضافة نقطة جغرافية'
  },
  {
    id: 'line' as DrawingMode,
    label: 'خط',
    icon: Route,
    description: 'رسم خط أو مسار'
  },
  {
    id: 'polygon' as DrawingMode,
    label: 'مضلع',
    icon: Shapes,
    description: 'رسم مضلع أو منطقة'
  },
  {
    id: 'rectangle' as DrawingMode,
    label: 'مستطيل',
    icon: Square,
    description: 'رسم مستطيل أو مربع'
  },
  {
    id: 'circle' as DrawingMode,
    label: 'دائرة',
    icon: Circle,
    description: 'رسم دائرة أو نطاق'
  }
];

export default function DrawingToolbar({
  currentMode,
  onModeChange,
  onClear,
  onExport,
  onImport,
  isEnabled = true
}: DrawingToolbarProps) {
  return (
    <Card className="mb-4" data-testid="drawing-toolbar">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {/* أدوات الرسم */}
          <div className="flex gap-1 border-l pl-2 ml-2">
            {tools.map((tool) => {
              const IconComponent = tool.icon;
              const isActive = currentMode === tool.id;
              
              return (
                <Button
                  key={tool.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onModeChange(tool.id)}
                  disabled={!isEnabled}
                  title={tool.description}
                  data-testid={`button-drawing-tool-${tool.id}`}
                  className={`
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    hover:bg-primary hover:text-primary-foreground
                    transition-colors
                  `}
                >
                  <IconComponent className="h-4 w-4 ml-1" />
                  <span className="text-sm">{tool.label}</span>
                </Button>
              );
            })}
          </div>
          
          {/* أدوات الإدارة */}
          <div className="flex gap-1 border-r pr-2 mr-2">
            {onClear && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClear}
                disabled={!isEnabled}
                title="مسح جميع الرسومات"
                data-testid="button-clear-drawings"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 ml-1" />
                <span className="text-sm">مسح</span>
              </Button>
            )}
            
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={!isEnabled}
                title="تصدير الرسومات"
                data-testid="button-export-drawings"
              >
                <Download className="h-4 w-4 ml-1" />
                <span className="text-sm">تصدير</span>
              </Button>
            )}
            
            {onImport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onImport}
                disabled={!isEnabled}
                title="استيراد رسومات"
                data-testid="button-import-drawings"
              >
                <Upload className="h-4 w-4 ml-1" />
                <span className="text-sm">استيراد</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* معلومات الأداة المختارة */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium">الأداة النشطة:</span>
              <span className="text-primary font-medium">
                {tools.find(t => t.id === currentMode)?.label || 'غير محدد'}
              </span>
            </div>
            
            {currentMode !== 'pan' && (
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {currentMode === 'point' && 'انقر على الخريطة لإضافة نقطة'}
                {currentMode === 'line' && 'انقر لبدء الخط وانقر مزدوجاً لإنهائه'}
                {currentMode === 'polygon' && 'انقر لإضافة نقاط وانقر مزدوجاً لإنهاء المضلع'}
                {currentMode === 'rectangle' && 'انقر واسحب لرسم مستطيل'}
                {currentMode === 'circle' && 'انقر للمركز وانقر مرة أخرى لتحديد النصف قطر'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}