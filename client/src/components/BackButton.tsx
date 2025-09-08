import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  autoDetect?: boolean;
}

export default function BackButton({ 
  to, 
  label = "العودة", 
  className = "",
  variant = "ghost",
  autoDetect = true 
}: BackButtonProps) {
  const [location, setLocation] = useLocation();

  const handleBack = () => {
    if (to) {
      setLocation(to);
      return;
    }

    if (autoDetect) {
      // Auto-detect back navigation based on current route
      if (location.includes('/employee/engineer')) {
        setLocation('/employee');
      } else if (location.includes('/employee/assistant-manager')) {
        setLocation('/employee');
      } else if (location.includes('/employee/manager')) {
        setLocation('/employee');
      } else if (location.includes('/employee/assignment-form')) {
        setLocation('/employee/assistant-manager');
      } else if (location.startsWith('/employee/')) {
        setLocation('/employee');
      } else if (location.startsWith('/citizen/')) {
        setLocation('/citizen');
      } else {
        setLocation('/');
      }
    } else {
      // Fallback to browser back
      window.history.back();
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleBack}
      className={`flex items-center space-x-2 space-x-reverse ${className}`}
      data-testid="button-back"
    >
      <ArrowRight className="ml-2 h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}