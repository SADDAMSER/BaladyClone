import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: "primary" | "secondary" | "accent";
  badgeText: string;
  href: string;
  className?: string;
  "data-testid"?: string;
}

export default function ServiceCard({
  title,
  description,
  icon: Icon,
  color,
  badgeText,
  href,
  className = "",
  "data-testid": testId
}: ServiceCardProps) {
  const colorClasses = {
    primary: "bg-primary/20 text-primary bg-primary/10",
    secondary: "bg-secondary/20 text-secondary bg-secondary/10",
    accent: "bg-accent/20 text-accent bg-accent/10"
  };

  return (
    <Link href={href}>
      <Card className={`service-card cursor-pointer ${className}`} data-testid={testId}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 space-x-reverse mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]}`}>
              <Icon size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground" data-testid={`${testId}-title`}>{title}</h4>
              <p className="text-sm text-muted-foreground" data-testid={`${testId}-description`}>{description}</p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <Badge 
              className={`text-xs px-2 py-1 rounded-full ${colorClasses[color].split(' ')[2]} ${colorClasses[color].split(' ')[1]}`}
              data-testid={`${testId}-badge`}
            >
              {badgeText}
            </Badge>
            <ChevronLeft className="text-muted-foreground" size={16} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
