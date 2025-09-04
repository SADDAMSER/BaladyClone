import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Save, 
  Eye, 
  Settings, 
  Workflow, 
  Users, 
  FileText, 
  Layers,
  Trash2,
  Edit,
  Copy,
  ArrowRight,
  Timer,
  DollarSign,
  Building,
  GripVertical,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from "react-beautiful-dnd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ServiceBuilderConfig, FormFieldConfig, WorkflowStageConfig } from "@shared/schema";
import WorkflowEngine from "@/components/WorkflowEngine";

interface ServiceTemplate {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  category: string;
  subcategory?: string;
  icon?: string;
  templateData: ServiceBuilderConfig;
  usageCount: number;
  rating: number;
}

interface FieldPalette {
  type: string;
  label: string;
  icon: string;
  category: string;
}

const fieldPalette: FieldPalette[] = [
  // أساسي
  { type: "text", label: "نص قصير", icon: "📝", category: "أساسي" },
  { type: "textarea", label: "نص طويل", icon: "📄", category: "أساسي" },
  { type: "number", label: "رقم", icon: "🔢", category: "أساسي" },
  { type: "email", label: "بريد إلكتروني", icon: "📧", category: "أساسي" },
  { type: "phone", label: "رقم هاتف", icon: "📱", category: "أساسي" },
  
  // تاريخ ووقت
  { type: "date", label: "تاريخ", icon: "📅", category: "تاريخ ووقت" },
  { type: "time", label: "وقت", icon: "🕐", category: "تاريخ ووقت" },
  { type: "datetime", label: "تاريخ ووقت", icon: "📅🕐", category: "تاريخ ووقت" },
  
  // اختيارات
  { type: "select", label: "قائمة منسدلة", icon: "📋", category: "اختيارات" },
  { type: "radio", label: "أزرار اختيار", icon: "🔘", category: "اختيارات" },
  { type: "checkbox", label: "خانات تأشير", icon: "☑️", category: "اختيارات" },
  
  // ملفات ووسائط
  { type: "file", label: "رفع ملف", icon: "📎", category: "ملفات ووسائط" },
  { type: "image", label: "رفع صورة", icon: "🖼️", category: "ملفات ووسائط" },
  { type: "signature", label: "توقيع رقمي", icon: "✍️", category: "ملفات ووسائط" },
  
  // متقدم
  { type: "map", label: "خريطة", icon: "🗺️", category: "متقدم" },
  { type: "barcode", label: "باركود", icon: "📊", category: "متقدم" },
  { type: "qr", label: "رمز QR", icon: "⬜", category: "متقدم" },
];

export default function ServiceBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("basic");
  const [serviceConfig, setServiceConfig] = useState<ServiceBuilderConfig>({
    basicInfo: {
      name: "",
      description: "",
      category: "",
      estimatedTime: 3,
      fees: 0,
    },
    formConfig: {
      fields: [],
      layout: {
        columns: 2,
        sections: [],
        theme: {
          primaryColor: "#2563eb",
          secondaryColor: "#64748b",
          fontFamily: "Cairo",
          spacing: "normal"
        }
      },
      validation: {
        validateOnSubmit: true,
        validateOnBlur: false,
        showErrorSummary: true,
        customValidators: []
      }
    },
    workflowConfig: {
      stages: [
        {
          id: "start",
          name: "بداية الطلب",
          type: "start",
          position: { x: 100, y: 100 }
        },
        {
          id: "review",
          name: "مراجعة الطلب",
          type: "user_task",
          position: { x: 300, y: 100 }
        },
        {
          id: "end",
          name: "انتهاء الطلب",
          type: "end",
          position: { x: 500, y: 100 }
        }
      ],
      transitions: [
        { id: "start_to_review", from: "start", to: "review", condition: { operator: "always" } },
        { id: "review_to_end", from: "review", to: "end", condition: { operator: "always" } }
      ],
      rules: []
    },
    organizationConfig: {
      departments: [],
      roles: [],
      permissions: []
    }
  });

  const [showPreview, setShowPreview] = useState(false);
  const [selectedField, setSelectedField] = useState<FormFieldConfig | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  // جلب القوالب المتاحة
  const { data: templates = [] } = useQuery<ServiceTemplate[]>({
    queryKey: ["/api/service-templates"],
    retry: false,
  });

  // حفظ الخدمة
  const saveServiceMutation = useMutation({
    mutationFn: async (data: ServiceBuilderConfig) => {
      return await apiRequest("/api/service-builder", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "تم الحفظ",
        description: "تم حفظ الخدمة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // إضافة حقل جديد للنموذج
  const addField = (fieldType: string) => {
    const newField: FormFieldConfig = {
      id: `field_${Date.now()}`,
      type: fieldType as any,
      label: `حقل ${fieldPalette.find(f => f.type === fieldType)?.label || fieldType}`,
      required: false,
      visible: true,
      layout: {
        width: 50,
        order: serviceConfig.formConfig.fields.length + 1,
        section: undefined
      }
    };

    setServiceConfig(prev => ({
      ...prev,
      formConfig: {
        ...prev.formConfig,
        fields: [...prev.formConfig.fields, newField]
      }
    }));
  };

  // تحديث خصائص الحقل
  const updateField = (fieldId: string, updates: Partial<FormFieldConfig>) => {
    setServiceConfig(prev => ({
      ...prev,
      formConfig: {
        ...prev.formConfig,
        fields: prev.formConfig.fields.map(field =>
          field.id === fieldId ? { ...field, ...updates } : field
        )
      }
    }));
  };

  // حذف حقل
  const deleteField = (fieldId: string) => {
    setServiceConfig(prev => ({
      ...prev,
      formConfig: {
        ...prev.formConfig,
        fields: prev.formConfig.fields.filter(field => field.id !== fieldId)
      }
    }));
  };

  // إعادة ترتيب الحقول
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const fields = Array.from(serviceConfig.formConfig.fields);
    const [reorderedItem] = fields.splice(result.source.index, 1);
    fields.splice(result.destination.index, 0, reorderedItem);

    // تحديث ترتيب الحقول
    const updatedFields = fields.map((field, index) => ({
      ...field,
      layout: { ...field.layout, order: index + 1 }
    }));

    setServiceConfig(prev => ({
      ...prev,
      formConfig: {
        ...prev.formConfig,
        fields: updatedFields
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">منشئ الخدمات الذكي</h1>
              <p className="text-gray-600 mt-2">إنشاء خدمات حكومية جديدة بدون كتابة كود</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                معاينة
              </Button>
              <Button
                onClick={() => saveServiceMutation.mutate(serviceConfig)}
                disabled={saveServiceMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saveServiceMutation.isPending ? "جاري الحفظ..." : "حفظ الخدمة"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* الشريط الجانبي - لوحة الأدوات */}
          <div className="col-span-3">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                لوحة الأدوات
              </h3>
              
              <ScrollArea className="h-96">
                {Object.entries(
                  fieldPalette.reduce((acc, field) => {
                    if (!acc[field.category]) acc[field.category] = [];
                    acc[field.category].push(field);
                    return acc;
                  }, {} as Record<string, FieldPalette[]>)
                ).map(([category, fields]) => (
                  <div key={category} className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
                    <div className="space-y-2">
                      {fields.map((field) => (
                        <Button
                          key={field.type}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-auto p-2"
                          onClick={() => addField(field.type)}
                        >
                          <span className="text-lg mr-2">{field.icon}</span>
                          <span className="text-sm">{field.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </Card>
          </div>

          {/* المنطقة الرئيسية */}
          <div className="col-span-9">
            <Card className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    المعلومات الأساسية
                  </TabsTrigger>
                  <TabsTrigger value="form" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    تصميم النموذج
                  </TabsTrigger>
                  <TabsTrigger value="workflow" className="flex items-center gap-2">
                    <Workflow className="w-4 h-4" />
                    سير العمل
                  </TabsTrigger>
                  <TabsTrigger value="organization" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    التنظيم
                  </TabsTrigger>
                </TabsList>

                {/* تبويب المعلومات الأساسية */}
                <TabsContent value="basic" className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="service-name">اسم الخدمة</Label>
                        <Input
                          id="service-name"
                          value={serviceConfig.basicInfo.name}
                          onChange={(e) => setServiceConfig(prev => ({
                            ...prev,
                            basicInfo: { ...prev.basicInfo, name: e.target.value }
                          }))}
                          placeholder="مثال: شهادة عدم ممانعة"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="service-name-en">الاسم باللغة الإنجليزية</Label>
                        <Input
                          id="service-name-en"
                          value={serviceConfig.basicInfo.nameEn || ""}
                          onChange={(e) => setServiceConfig(prev => ({
                            ...prev,
                            basicInfo: { ...prev.basicInfo, nameEn: e.target.value }
                          }))}
                          placeholder="No Objection Certificate"
                        />
                      </div>

                      <div>
                        <Label htmlFor="category">فئة الخدمة</Label>
                        <Select
                          value={serviceConfig.basicInfo.category}
                          onValueChange={(value) => setServiceConfig(prev => ({
                            ...prev,
                            basicInfo: { ...prev.basicInfo, category: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر فئة الخدمة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="government">حكومية عامة</SelectItem>
                            <SelectItem value="municipal">بلدية</SelectItem>
                            <SelectItem value="educational">تعليمية</SelectItem>
                            <SelectItem value="health">صحية</SelectItem>
                            <SelectItem value="legal">قانونية</SelectItem>
                            <SelectItem value="financial">مالية</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="estimated-time">مدة الإنجاز المتوقعة (بالأيام)</Label>
                        <div className="flex items-center gap-2">
                          <Timer className="w-4 h-4 text-gray-500" />
                          <Input
                            id="estimated-time"
                            type="number"
                            min="1"
                            value={serviceConfig.basicInfo.estimatedTime}
                            onChange={(e) => setServiceConfig(prev => ({
                              ...prev,
                              basicInfo: { ...prev.basicInfo, estimatedTime: parseInt(e.target.value) }
                            }))}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="fees">الرسوم (ريال يمني)</Label>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <Input
                            id="fees"
                            type="number"
                            min="0"
                            value={serviceConfig.basicInfo.fees || 0}
                            onChange={(e) => setServiceConfig(prev => ({
                              ...prev,
                              basicInfo: { ...prev.basicInfo, fees: parseInt(e.target.value) }
                            }))}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="icon">أيقونة الخدمة</Label>
                        <Input
                          id="icon"
                          value={serviceConfig.basicInfo.icon || ""}
                          onChange={(e) => setServiceConfig(prev => ({
                            ...prev,
                            basicInfo: { ...prev.basicInfo, icon: e.target.value }
                          }))}
                          placeholder="🏢"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">وصف الخدمة</Label>
                    <Textarea
                      id="description"
                      value={serviceConfig.basicInfo.description}
                      onChange={(e) => setServiceConfig(prev => ({
                        ...prev,
                        basicInfo: { ...prev.basicInfo, description: e.target.value }
                      }))}
                      placeholder="وصف تفصيلي للخدمة وأهدافها"
                      rows={4}
                    />
                  </div>
                </TabsContent>

                {/* تبويب تصميم النموذج */}
                <TabsContent value="form" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">حقول النموذج</h3>
                    <Badge variant="secondary">
                      {serviceConfig.formConfig.fields.length} حقل
                    </Badge>
                  </div>

                  {serviceConfig.formConfig.fields.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">لم يتم إضافة أي حقول بعد</p>
                      <p className="text-sm text-gray-400">اسحب حقلاً من لوحة الأدوات أو انقر على زر إضافة</p>
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="form-fields">
                        {(provided: DroppableProvided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-3"
                          >
                            {serviceConfig.formConfig.fields.map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`p-4 bg-white border rounded-lg shadow-sm ${
                                      snapshot.isDragging ? "shadow-lg" : ""
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="cursor-grab active:cursor-grabbing"
                                        >
                                          <GripVertical className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">
                                              {fieldPalette.find(f => f.type === field.type)?.icon}
                                            </span>
                                            <span className="font-medium">{field.label}</span>
                                            {field.required && (
                                              <Badge variant="destructive">مطلوب</Badge>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-500">
                                            {fieldPalette.find(f => f.type === field.type)?.label} • 
                                            عرض {field.layout?.width}%
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedField(field);
                                            setShowFieldEditor(true);
                                          }}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => deleteField(field.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </TabsContent>

                {/* تبويب سير العمل */}
                <TabsContent value="workflow" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">مراحل سير العمل</h3>
                    <Badge variant="secondary">
                      {serviceConfig.workflowConfig.stages.length} مرحلة
                    </Badge>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg min-h-96">
                    <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
                      {serviceConfig.workflowConfig.stages.map((stage, index) => (
                        <div key={stage.id} className="flex items-center">
                          <div className="bg-white border-2 border-blue-200 rounded-lg p-4 min-w-32 text-center">
                            <div className="text-2xl mb-2">
                              {stage.type === "start" && "🏁"}
                              {stage.type === "user_task" && "👤"}
                              {stage.type === "service_task" && "⚙️"}
                              {stage.type === "decision" && "❓"}
                              {stage.type === "end" && "🎯"}
                            </div>
                            <div className="font-medium text-sm">{stage.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{stage.type}</div>
                          </div>
                          
                          {index < serviceConfig.workflowConfig.stages.length - 1 && (
                            <ArrowRight className="w-6 h-6 text-gray-400 mx-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
                      <Plus className="w-6 h-6" />
                      إضافة مرحلة
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
                      <Settings className="w-6 h-6" />
                      إعدادات متقدمة
                    </Button>
                  </div>
                </TabsContent>

                {/* تبويب التنظيم */}
                <TabsContent value="organization" className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        الأقسام المشاركة
                      </h4>
                      <div className="space-y-2">
                        {serviceConfig.organizationConfig.departments.map((dept, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span>{dept}</span>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          إضافة قسم
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        الأدوار المطلوبة
                      </h4>
                      <div className="space-y-2">
                        {serviceConfig.organizationConfig.roles.map((role, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span>{role}</span>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          إضافة دور
                        </Button>
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>

        {/* نافذة تحرير الحقل */}
        <Dialog open={showFieldEditor} onOpenChange={setShowFieldEditor}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>تحرير خصائص الحقل</DialogTitle>
            </DialogHeader>
            {selectedField && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>التسمية</Label>
                    <Input
                      value={selectedField.label}
                      onChange={(e) => setSelectedField(prev => prev ? { ...prev, label: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label>النص التوضيحي</Label>
                    <Input
                      value={selectedField.placeholder || ""}
                      onChange={(e) => setSelectedField(prev => prev ? { ...prev, placeholder: e.target.value } : null)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="required"
                      checked={selectedField.required}
                      onChange={(e) => setSelectedField(prev => prev ? { ...prev, required: e.target.checked } : null)}
                    />
                    <Label htmlFor="required">حقل مطلوب</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="visible"
                      checked={selectedField.visible}
                      onChange={(e) => setSelectedField(prev => prev ? { ...prev, visible: e.target.checked } : null)}
                    />
                    <Label htmlFor="visible">مرئي</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowFieldEditor(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={() => {
                    if (selectedField) {
                      updateField(selectedField.id, selectedField);
                      setShowFieldEditor(false);
                    }
                  }}>
                    حفظ التغييرات
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* نافذة المعاينة */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle>معاينة الخدمة</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-96">
              <div className="space-y-6 p-4">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-bold">{serviceConfig.basicInfo.name}</h3>
                  <p className="text-gray-600 mt-2">{serviceConfig.basicInfo.description}</p>
                  <div className="flex gap-4 mt-3">
                    <Badge variant="outline">
                      <Timer className="w-3 h-3 mr-1" />
                      {serviceConfig.basicInfo.estimatedTime} أيام
                    </Badge>
                    <Badge variant="outline">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {serviceConfig.basicInfo.fees} ريال
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {serviceConfig.formConfig.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {field.type === "textarea" ? (
                        <Textarea placeholder={field.placeholder} disabled />
                      ) : field.type === "select" ? (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder={field.placeholder} />
                          </SelectTrigger>
                        </Select>
                      ) : (
                        <Input 
                          type={field.type === "number" ? "number" : "text"}
                          placeholder={field.placeholder} 
                          disabled 
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}