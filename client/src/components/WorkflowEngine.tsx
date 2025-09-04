import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Save, 
  Plus, 
  Settings, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  ArrowRight,
  Trash2,
  Edit3
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  type: 'start' | 'task' | 'decision' | 'end';
  position: { x: number; y: number };
  assignedTo?: string;
  conditions?: string;
  duration?: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  connections: string[];
}

interface WorkflowEngineProps {
  workflowId?: string;
  isReadOnly?: boolean;
  onSave?: (workflow: any) => void;
}

export default function WorkflowEngine({ workflowId, isReadOnly = false, onSave }: WorkflowEngineProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: 'start',
      title: 'بداية العملية',
      description: 'نقطة البداية لسير العمل',
      type: 'start',
      position: { x: 100, y: 100 },
      status: 'completed',
      connections: []
    }
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [draggedStep, setDraggedStep] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const stepTypes = [
    { value: 'task', label: 'مهمة', icon: Settings },
    { value: 'decision', label: 'قرار', icon: AlertCircle },
    { value: 'end', label: 'نهاية', icon: CheckCircle }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'start': return Play;
      case 'task': return Settings;
      case 'decision': return AlertCircle;
      case 'end': return CheckCircle;
      default: return Settings;
    }
  };

  const addStep = (type: 'task' | 'decision' | 'end') => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      title: `خطوة جديدة`,
      description: 'وصف الخطوة',
      type,
      position: { x: 300 + steps.length * 50, y: 200 + steps.length * 30 },
      status: 'pending',
      connections: []
    };
    
    setSteps(prev => [...prev, newStep]);
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const deleteStep = (stepId: string) => {
    if (stepId === 'start') return; // Don't delete start step
    
    setSteps(prev => {
      const filteredSteps = prev.filter(step => step.id !== stepId);
      // Remove connections to deleted step
      return filteredSteps.map(step => ({
        ...step,
        connections: step.connections.filter(conn => conn !== stepId)
      }));
    });
  };

  const handleDragStart = (stepId: string) => {
    setDraggedStep(stepId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedStep || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateStep(draggedStep, { position: { x, y } });
    setDraggedStep(null);
  };

  const connectSteps = (fromId: string, toId: string) => {
    updateStep(fromId, {
      connections: [...(steps.find(s => s.id === fromId)?.connections || []), toId]
    });
  };

  const runWorkflow = async () => {
    setIsRunning(true);
    
    // Simulate workflow execution
    for (const step of steps) {
      if (step.type === 'start') continue;
      
      updateStep(step.id, { status: 'active' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep(step.id, { status: 'completed' });
    }
    
    setIsRunning(false);
  };

  const stopWorkflow = () => {
    setIsRunning(false);
    setSteps(prev => prev.map(step => ({
      ...step,
      status: step.type === 'start' ? 'completed' : 'pending'
    })));
  };

  const saveWorkflow = () => {
    const workflowData = {
      id: workflowId || `workflow_${Date.now()}`,
      name: 'سير عمل جديد',
      steps,
      createdAt: new Date().toISOString()
    };
    
    onSave?.(workflowData);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50" dir="rtl">
      {/* Toolbar */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">محرك سير العمل المرئي</h2>
          <Badge variant="secondary">متقدم</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addStep('task')}
                data-testid="add-task-step"
              >
                <Plus className="w-4 h-4 ml-1" />
                إضافة مهمة
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => addStep('decision')}
                data-testid="add-decision-step"
              >
                <AlertCircle className="w-4 h-4 ml-1" />
                إضافة قرار
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => addStep('end')}
                data-testid="add-end-step"
              >
                <CheckCircle className="w-4 h-4 ml-1" />
                إضافة نهاية
              </Button>
            </>
          )}
          
          <div className="border-r h-6 mx-2" />
          
          <Button
            onClick={runWorkflow}
            disabled={isRunning}
            size="sm"
            data-testid="run-workflow"
          >
            <Play className="w-4 h-4 ml-1" />
            تشغيل
          </Button>
          
          <Button
            variant="outline"
            onClick={stopWorkflow}
            disabled={!isRunning}
            size="sm"
            data-testid="stop-workflow"
          >
            <Square className="w-4 h-4 ml-1" />
            إيقاف
          </Button>
          
          <Button
            variant="outline"
            onClick={stopWorkflow}
            size="sm"
            data-testid="reset-workflow"
          >
            <RotateCcw className="w-4 h-4 ml-1" />
            إعادة تعيين
          </Button>
          
          {!isReadOnly && (
            <Button
              variant="default"
              onClick={saveWorkflow}
              size="sm"
              data-testid="save-workflow"
            >
              <Save className="w-4 h-4 ml-1" />
              حفظ
            </Button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          className="w-full h-full relative bg-gray-100"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-testid="workflow-canvas"
        >
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />

          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {steps.map(step =>
              step.connections.map(connId => {
                const targetStep = steps.find(s => s.id === connId);
                if (!targetStep) return null;

                return (
                  <line
                    key={`${step.id}-${connId}`}
                    x1={step.position.x + 100}
                    y1={step.position.y + 40}
                    x2={targetStep.position.x}
                    y2={targetStep.position.y + 40}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })
            )}
            
            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#3b82f6"
                />
              </marker>
            </defs>
          </svg>

          {/* Workflow Steps */}
          {steps.map(step => {
            const StepIcon = getStepIcon(step.type);
            
            return (
              <Card
                key={step.id}
                className={`absolute w-48 cursor-move border-2 transition-all ${
                  step.status === 'active' ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                }`}
                style={{
                  left: step.position.x,
                  top: step.position.y,
                  transform: draggedStep === step.id ? 'scale(1.05)' : 'scale(1)'
                }}
                draggable={!isReadOnly}
                onDragStart={() => handleDragStart(step.id)}
                onClick={() => {
                  setSelectedStep(step);
                  setShowStepDialog(true);
                }}
                data-testid={`workflow-step-${step.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(step.status)}`} />
                      <StepIcon className="w-4 h-4" />
                    </div>
                    
                    {!isReadOnly && step.type !== 'start' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStep(step.id);
                        }}
                        data-testid={`delete-step-${step.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  <CardTitle className="text-sm">{step.title}</CardTitle>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                  
                  {step.assignedTo && (
                    <div className="flex items-center gap-1 text-xs">
                      <Users className="w-3 h-3" />
                      <span>{step.assignedTo}</span>
                    </div>
                  )}
                  
                  {step.duration && (
                    <div className="flex items-center gap-1 text-xs mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{step.duration} دقيقة</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Step Configuration Dialog */}
      <Dialog open={showStepDialog} onOpenChange={setShowStepDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تحرير الخطوة</DialogTitle>
          </DialogHeader>
          
          {selectedStep && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="stepTitle">عنوان الخطوة</Label>
                <Input
                  id="stepTitle"
                  value={selectedStep.title}
                  onChange={(e) =>
                    setSelectedStep({ ...selectedStep, title: e.target.value })
                  }
                  data-testid="step-title-input"
                />
              </div>
              
              <div>
                <Label htmlFor="stepDescription">الوصف</Label>
                <Textarea
                  id="stepDescription"
                  value={selectedStep.description}
                  onChange={(e) =>
                    setSelectedStep({ ...selectedStep, description: e.target.value })
                  }
                  data-testid="step-description-input"
                />
              </div>
              
              {selectedStep.type !== 'start' && (
                <>
                  <div>
                    <Label htmlFor="stepAssignee">المكلف</Label>
                    <Input
                      id="stepAssignee"
                      value={selectedStep.assignedTo || ''}
                      onChange={(e) =>
                        setSelectedStep({ ...selectedStep, assignedTo: e.target.value })
                      }
                      placeholder="اسم الموظف أو القسم"
                      data-testid="step-assignee-input"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="stepDuration">المدة المتوقعة (دقيقة)</Label>
                    <Input
                      id="stepDuration"
                      type="number"
                      value={selectedStep.duration || ''}
                      onChange={(e) =>
                        setSelectedStep({ ...selectedStep, duration: parseInt(e.target.value) || undefined })
                      }
                      data-testid="step-duration-input"
                    />
                  </div>
                </>
              )}
              
              {selectedStep.type === 'decision' && (
                <div>
                  <Label htmlFor="stepConditions">شروط القرار</Label>
                  <Textarea
                    id="stepConditions"
                    value={selectedStep.conditions || ''}
                    onChange={(e) =>
                      setSelectedStep({ ...selectedStep, conditions: e.target.value })
                    }
                    placeholder="حدد شروط اتخاذ القرار..."
                    data-testid="step-conditions-input"
                  />
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowStepDialog(false)}
                  data-testid="cancel-step-edit"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={() => {
                    updateStep(selectedStep.id, selectedStep);
                    setShowStepDialog(false);
                  }}
                  data-testid="save-step-edit"
                >
                  حفظ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}