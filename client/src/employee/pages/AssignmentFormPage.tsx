import { useState } from 'react';
import { useLocation } from 'wouter';
import AssignmentForm from '../components/AssignmentForm';
import PageHeader from '@/components/PageHeader';

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
      <PageHeader
        title="نموذج تكليف مهندس مساحة"
        description="إعداد وتكليف مهندس للقيام بمساحة الأرض المطلوبة"
        backTo="/employee/assistant-manager"
        backLabel="العودة للوحة التحكم"
        breadcrumbs={[
          { label: 'الصفحة الرئيسية', href: '/' },
          { label: 'الموظفين', href: '/employee' },
          { label: 'مساعد مدير القسم', href: '/employee/assistant-manager' },
          { label: 'نموذج التكليف', current: true }
        ]}
      />

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