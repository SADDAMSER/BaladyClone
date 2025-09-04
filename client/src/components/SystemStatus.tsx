import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SystemStatus() {
  const statusItems = [
    {
      id: "database",
      label: "قاعدة البيانات",
      status: "متصلة",
      statusColor: "bg-green-100 text-green-800"
    },
    {
      id: "legal-engine",
      label: "محرك القوانين",
      status: "يعمل",
      statusColor: "bg-green-100 text-green-800"
    },
    {
      id: "surveying-system",
      label: "نظام المساحة",
      status: "متاح",
      statusColor: "bg-green-100 text-green-800"
    }
  ];

  return (
    <Card data-testid="system-status-card">
      <CardHeader>
        <CardTitle className="font-cairo">حالة النظام</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {statusItems.map((item) => (
            <div key={item.id} className="flex justify-between items-center" data-testid={`status-${item.id}`}>
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <Badge className={`text-xs px-2 py-1 rounded-full ${item.statusColor}`}>
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
