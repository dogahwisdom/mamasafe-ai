import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ChartCardProps {
  title: string;
  data: any[];
  dataKey: string;
  type?: 'line' | 'area' | 'bar';
  color?: string;
  height?: number;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  data,
  dataKey,
  type = 'area',
  color = '#14b8a6',
  height = 200,
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-[#2c2c2e]/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
          <p className="font-semibold text-slate-500 mb-1">{label}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {payload[0].value} <span className="text-xs font-normal text-slate-500">patients</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 10, left: 0, bottom: 0 },
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
          </BarChart>
        );
      
      default: // area
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              fill={`url(#gradient-${dataKey})`}
              strokeWidth={2}
            />
          </AreaChart>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
