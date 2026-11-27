import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const revenueData = [
  { day: 'Mon', revenue: 12500 },
  { day: 'Tue', revenue: 18200 },
  { day: 'Wed', revenue: 14800 },
  { day: 'Thu', revenue: 22500 },
  { day: 'Fri', revenue: 19800 },
  { day: 'Sat', revenue: 31200 },
  { day: 'Sun', revenue: 26500 },
];

function RevenueChart() {
  return (
    <div className="revenue-chart-card">
      <div className="chart-header">
        <div>
          <h3>Revenue Overview</h3>
          <p>Daily revenue performance</p>
        </div>

        <select defaultValue="week" aria-label="Revenue period">
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={revenueData}
            margin={{ top: 15, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C58B5A" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#C58B5A" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="#E7E1DA"
              strokeDasharray="4 4"
              vertical={false}
            />

            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#737B84', fontSize: 11 }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#737B84', fontSize: 11 }}
              tickFormatter={(value) => `₹${value / 1000}k`}
              width={48}
            />

            <Tooltip
              formatter={(value) => [
                `₹${Number(value).toLocaleString('en-IN')}`,
                'Revenue',
              ]}
              contentStyle={{
                border: '1px solid #E7E1DA',
                borderRadius: '10px',
                fontSize: '12px',
              }}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#C58B5A"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              activeDot={{ r: 5, fill: '#C58B5A' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RevenueChart;