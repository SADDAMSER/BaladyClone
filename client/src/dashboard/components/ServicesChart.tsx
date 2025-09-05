import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'تراخيص البناء', value: 45, color: '#3b82f6' },
  { name: 'القرار المساحي', value: 23, color: '#10b981' },
  { name: 'الاشتراطات الفنية', value: 18, color: '#f59e0b' },
  { name: 'النظام القانوني', value: 12, color: '#ef4444' },
  { name: 'خدمات أخرى', value: 2, color: '#8b5cf6' }
];

const COLORS = data.map(item => item.color);

export default function ServicesChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}