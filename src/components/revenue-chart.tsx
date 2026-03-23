"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";

interface RevenueChartProps {
  data: {
    name: string;
    total: number;
  }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke={isDark ? "#374151" : "#e5e7eb"} 
          vertical={false} 
          opacity={0.5}
        />
        <XAxis
          dataKey="name"
          stroke={isDark ? "#9ca3af" : "#6b7280"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={isDark ? "#9ca3af" : "#6b7280"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          cursor={{ fill: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-background/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl p-3.5">
                  <p className="text-sm font-medium text-foreground/90">
                    {payload[0].payload.name}
                  </p>
                  <p className="text-base font-bold text-primary mt-0.5">
                    ${payload[0].value?.toLocaleString()}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="total"
          fill="url(#barGradient)"
          radius={[12, 12, 0, 0]}
          maxBarSize={60}
        />
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}
