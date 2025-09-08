import React, { useState } from 'react';
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
  Upload,
  Layers,
  Settings
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
  const [showLayers, setShowLayers] = useState(false);

  return (
    <div className="mb-4 space-y-3" data-testid="drawing-toolbar">
      {/* شريط الأدوات الرئيسي */}
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          
          {/* أدوات الرسم الأساسية */}
          <div className="flex items-center gap-2">
            {tools.map((tool) => {
              const IconComponent = tool.icon;
              const isActive = currentMode === tool.id;
              
              return (
                <div key={tool.id} className="flex flex-col items-center">
                  <Button
                    variant={isActive ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => onModeChange(tool.id)}
                    disabled={!isEnabled}
                    title={tool.description}
                    data-testid={`button-drawing-tool-${tool.id}`}
                    className={`
                      w-14 h-14 rounded-xl transition-all duration-200 border-2
                      ${isActive 
                        ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/25 scale-105' 
                        : 'bg-white border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-600 hover:bg-green-50'
                      }
                    `}
                  >
                    <IconComponent className="h-6 w-6" />
                  </Button>
                  <span className="text-xs text-gray-600 mt-1 font-medium">
                    {tool.label}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* الفاصل */}
          <div className="h-16 w-px bg-gray-200"></div>
          
          {/* أدوات الإدارة */}
          <div className="flex items-center gap-2">
            {onClear && (
              <div className="flex flex-col items-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onClear}
                  disabled={!isEnabled}
                  title="مسح جميع الرسومات"
                  data-testid="button-clear-drawings"
                  className="w-14 h-14 rounded-xl border-2 border-red-200 text-red-600 hover:border-red-500 hover:bg-red-50 transition-all duration-200"
                >
                  <Trash2 className="h-6 w-6" />
                </Button>
                <span className="text-xs text-gray-600 mt-1 font-medium">
                  مسح
                </span>
              </div>
            )}
            
            {onExport && (
              <div className="flex flex-col items-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onExport}
                  disabled={!isEnabled}
                  title="تصدير الرسومات"
                  data-testid="button-export-drawings"
                  className="w-14 h-14 rounded-xl border-2 border-blue-200 text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                >
                  <Download className="h-6 w-6" />
                </Button>
                <span className="text-xs text-gray-600 mt-1 font-medium">
                  تصدير
                </span>
              </div>
            )}
            
            {/* طبقات الخريطة */}
            <div className="flex flex-col items-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowLayers(!showLayers)}
                disabled={!isEnabled}
                title="طبقات الخريطة"
                data-testid="button-map-layers"
                className={`
                  w-14 h-14 rounded-xl border-2 transition-all duration-200
                  ${showLayers 
                    ? 'border-purple-500 bg-purple-50 text-purple-600' 
                    : 'border-purple-200 text-purple-600 hover:border-purple-500 hover:bg-purple-50'
                  }
                `}
              >
                <Layers className="h-6 w-6" />
              </Button>
              <span className="text-xs text-gray-600 mt-1 font-medium">
                طبقات الخريطة
              </span>
            </div>
            
            {onImport && (
              <div className="flex flex-col items-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onImport}
                  disabled={!isEnabled}
                  title="استيراد رسومات"
                  data-testid="button-import-drawings"
                  className="w-14 h-14 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-gray-500 hover:bg-gray-50 transition-all duration-200"
                >
                  <Upload className="h-6 w-6" />
                </Button>
                <span className="text-xs text-gray-600 mt-1 font-medium">
                  استيراد
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* شريط النشاط الحالي */}
      <div className="flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-gray-200/50">
          <span className="text-sm text-gray-600 font-medium">
            الأداة النشطة: <span className="text-green-600 font-semibold">
              {tools.find(t => t.id === currentMode)?.label || 'غير محدد'}
            </span>
          </span>
        </div>
      </div>
      
      {/* لوحة طبقات الخريطة (قابلة للطي) */}
      {showLayers && (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-4 transition-all duration-300">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <Layers className="h-4 w-4 ml-2" />
            طبقات الخريطة
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
              <span className="text-sm text-gray-600">الخريطة الأساسية</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
              <span className="text-sm text-gray-600">صور الأقمار الصناعية</span>
              <input type="checkbox" className="rounded" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
              <span className="text-sm text-gray-600">التضاريس</span>
              <input type="checkbox" className="rounded" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
              <span className="text-sm text-gray-600">الحدود الإدارية</span>
              <input type="checkbox" className="rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}