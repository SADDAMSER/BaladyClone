import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  description?: string;
  loading?: boolean;
  onClick?: () => void;
}

const colorVariants = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800"
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950", 
    icon: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800"
  },
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-950",
    icon: "text-yellow-600 dark:text-yellow-400", 
    border: "border-yellow-200 dark:border-yellow-800"
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950",
    icon: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800"
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800"
  }
};

export default function KPICard({
  title,
  value,
  change,
  icon: Icon,
  color,
  description,
  loading = false,
  onClick
}: KPICardProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-3 w-16" />
      </Card>
    );
  }

  const variant = colorVariants[color];

  return (
    <Card 
      className={cn(
        "p-6 transition-all duration-200 hover:shadow-md cursor-pointer",
        variant.border,
        onClick && "hover:scale-105"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={cn("p-3 rounded-lg", variant.bg)}>
          <Icon className={cn("h-6 w-6", variant.icon)} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-2xl font-bold">{value}</div>
        
        {change && (
          <div className="flex items-center gap-1">
            {change.type === 'increase' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={cn(
              "text-sm font-medium",
              change.type === 'increase' ? "text-green-600" : "text-red-600"
            )}>
              {change.value}%
            </span>
            <span className="text-sm text-muted-foreground">{change.period}</span>
          </div>
        )}

        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </Card>
  );
}