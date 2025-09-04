import { Card, CardContent } from "@/components/ui/card";

export default function LegalEngineDemo() {
  const legalStats = [
    {
      title: "القوانين المحملة",
      items: [
        { label: "قانون البناء اليمني", value: "144 مادة", color: "text-primary" },
        { label: "اللائحة التنفيذية", value: "89 بند", color: "text-secondary" },
        { label: "دليل الاشتراطات", value: "167 اشتراط", color: "text-accent" }
      ]
    },
    {
      title: "الذكاء الاصطناعي",
      items: [
        { label: "دقة التحليل", value: "95.2%", color: "text-primary" },
        { label: "سرعة الاستجابة", value: "< 2 ثانية", color: "text-secondary" },
        { label: "التطابقات الناجحة", value: "98.7%", color: "text-accent" }
      ]
    },
    {
      title: "الإجراءات التلقائية",
      items: [
        { label: "معاملات آلية", value: "1,247", color: "text-primary" },
        { label: "وقت محسوب", value: "70%", color: "text-secondary" },
        { label: "خطأ بشري مقلل", value: "90%", color: "text-accent" }
      ]
    }
  ];

  return (
    <div className="mt-8 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6" data-testid="legal-engine-demo">
      <h3 className="text-xl font-semibold text-foreground mb-4 font-cairo">محرك القوانين الذكي</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {legalStats.map((section, index) => (
          <Card key={index} data-testid={`legal-stats-${index}`}>
            <CardContent className="p-4">
              <h4 className="font-semibold text-foreground mb-2">{section.title}</h4>
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={item.color}>{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
