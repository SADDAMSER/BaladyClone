import { useState } from 'react';
import { useLocation } from 'wouter';
import AssignmentForm from '../components/AssignmentForm';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function AssignmentFormPage() {
  const [, setLocation] = useLocation();

  const handleSave = (data: any) => {
    console.log('Saving assignment data:', data);
    // Here you would typically save the data to the backend
  };

  const handleSubmit = (data: any) => {
    console.log('Submitting assignment:', data);
    // Here you would typically submit the assignment to the backend
    // Then redirect back to the dashboard
    setLocation('/employee/assistant-manager');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Button
                variant="ghost"
                onClick={() => setLocation('/employee/assistant-manager')}
                data-testid="button-back"
              >
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة للوحة التحكم
              </Button>
              <div className="border-r border-gray-300 dark:border-gray-600 h-6 mx-4"></div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                نموذج تكليف مهندس مساحة
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-6">
        <AssignmentForm
          onSave={handleSave}
          onSubmit={handleSubmit}
          mode="create"
        />
      </div>
    </div>
  );
}