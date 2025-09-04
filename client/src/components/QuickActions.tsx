import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Download } from "lucide-react";

export default function QuickActions() {
  const actions = [
    {
      id: "new-request",
      label: "طلب جديد",
      icon: Plus,
      color: "bg-primary/10 hover:bg-primary/20 text-primary"
    },
    {
      id: "track-transaction",
      label: "تتبع المعاملة", 
      icon: Search,
      color: "bg-secondary/10 hover:bg-secondary/20 text-secondary"
    },
    {
      id: "download-forms",
      label: "تحميل النماذج",
      icon: Download,
      color: "bg-accent/10 hover:bg-accent/20 text-accent"
    }
  ];

  return (
    <Card data-testid="quick-actions-card">
      <CardHeader>
        <CardTitle className="font-cairo">الإجراءات السريعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              className={`w-full text-right px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 space-x-reverse ${action.color}`}
              variant="ghost"
              data-testid={`quick-action-${action.id}`}
            >
              <action.icon size={16} />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
