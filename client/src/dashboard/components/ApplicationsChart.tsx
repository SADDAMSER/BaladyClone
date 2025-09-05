import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'يناير', applications: 45, approved: 38, pending: 7 },
  { month: 'فبراير', applications: 52, approved: 44, pending: 8 },
  { month: 'مارس', applications: 61, approved: 53, pending: 8 },
  { month: 'أبريل', applications: 58, approved: 51, pending: 7 },
  { month: 'مايو', applications: 67, approved: 59, pending: 8 },
  { month: 'يونيو', applications: 74, approved: 65, pending: 9 },
  { month: 'يوليو', applications: 69, approved: 62, pending: 7 },
  { month: 'أغسطس', applications: 78, approved: 71, pending: 7 },
  { month: 'سبتمبر', applications: 82, approved: 74, pending: 8 },
  { month: 'أكتوبر', applications: 89, approved: 81, pending: 8 },
  { month: 'نوفمبر', applications: 76, approved: 69, pending: 7 },
  { month: 'ديسمبر', applications: 85, approved: 77, pending: 8 }
];

export default function ApplicationsChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="applications" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            name="إجمالي الطلبات"
          />
          <Line 
            type="monotone" 
            dataKey="approved" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
            name="المعتمدة"
          />
          <Line 
            type="monotone" 
            dataKey="pending" 
            stroke="#f59e0b" 
            strokeWidth={2}
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
            name="قيد المراجعة"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}