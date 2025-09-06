import { cn } from "@/lib/utils";

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  time: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'on_hold';
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${
              item.status === 'approved' ? 'bg-green-500' :
              item.status === 'rejected' ? 'bg-red-500' :
              item.status === 'under_review' ? 'bg-blue-500' :
              item.status === 'on_hold' ? 'bg-gray-500' :
              'bg-yellow-500'
            }`} />
            {index < items.length - 1 && (
              <div className="w-px h-8 bg-gray-200 mt-2" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900">{item.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            <p className="text-xs text-gray-500 mt-1">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}