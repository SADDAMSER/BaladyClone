import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "primary" | "secondary" | "accent";
  isLoading?: boolean;
  className?: string;
  "data-testid"?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  isLoading = false,
  className = "",
  "data-testid": testId
}: StatsCardProps) {
  const colorClasses = {
    primary: "text-primary bg-primary/20",
    secondary: "text-secondary bg-secondary/20", 
    accent: "text-accent bg-accent/20"
  };

  if (isLoading) {
    return (
      <Card className={`stats-card ${className}`} data-testid={testId}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="w-12 h-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`stats-card ${className}`} data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold" data-testid={`${testId}-value`}>
              {typeof value === 'number' ? value.toLocaleString('ar') : value}
            </p>
            <p className="text-muted-foreground text-sm" data-testid={`${testId}-title`}>
              {title}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon size={24} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
