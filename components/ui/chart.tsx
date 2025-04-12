'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Import each component separately to avoid undefined issues
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

const LineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false }
);

const Line = dynamic(
  () =>
    import('recharts').then(
      (mod) => mod.Line as unknown as React.ComponentType<any>
    ),
  {
    ssr: false,
  }
);

const XAxis = dynamic(
  () =>
    import('recharts').then(
      (mod) => mod.XAxis as unknown as React.ComponentType<any>
    ),
  { ssr: false }
);

const YAxis = dynamic(
  () =>
    import('recharts').then(
      (mod) => mod.YAxis as unknown as React.ComponentType<any>
    ),
  { ssr: false }
);

const Tooltip = dynamic(
  () =>
    import('recharts').then(
      (mod) => mod.Tooltip as unknown as React.ComponentType<any>
    ),
  { ssr: false }
);

const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
);

const ChartContainer = ({ children }: { children: React.ReactNode }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="w-full h-full" />;
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        {React.isValidElement(children) ? children : <div />}
      </ResponsiveContainer>
    </div>
  );
};

const Chart = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const LineChartWrapper = ({
  data,
  children,
}: {
  data: any[];
  children: React.ReactNode;
}) => {
  return (
    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      {children}
    </LineChart>
  );
};

const LineWrapper = ({
  dataKey,
  stroke,
  strokeWidth,
  name,
}: {
  dataKey: string;
  stroke: string;
  strokeWidth: number;
  name?: string;
}) => {
  return (
    <Line
      type="monotone"
      dataKey={dataKey}
      stroke={stroke}
      strokeWidth={strokeWidth}
      name={name}
    />
  );
};

const XAxisWrapper = ({
  dataKey,
  tickFormatter,
}: {
  dataKey: string;
  tickFormatter?: (value: any, index: number) => string;
}) => {
  return <XAxis dataKey={dataKey} tickFormatter={tickFormatter} />;
};

const YAxisWrapper = ({
  tickFormatter,
}: {
  tickFormatter?: (value: any) => string;
}) => {
  interface YAxisWrapperProps {
    tickFormatter?: (value: any) => string;
  }

  return (
    <YAxis
      tickFormatter={
        tickFormatter
          ? (value: any, index: number) => String(tickFormatter(value))
          : undefined
      }
    />
  );
};

const ChartTooltip = ({
  children,
}: {
  children: (props: { active?: boolean; payload?: any[] }) => React.ReactNode;
}) => {
  return (
    <Tooltip
      content={(props: { active?: boolean; payload?: any[] }) =>
        children(props)
      }
    />
  );
};

const ChartTooltipContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-background border rounded-md shadow-md p-2 text-foreground">
      {children}
    </div>
  );
};

const ChartTooltipItem = ({
  name,
  value,
  color,
}: {
  name: string;
  value: string | number;
  color?: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      {color && (
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        ></div>
      )}
      <span className="text-sm font-medium">{name}:</span>
      <span className="text-sm">{value}</span>
    </div>
  );
};

export {
  ChartContainer,
  Chart,
  LineChartWrapper as LineChart,
  LineWrapper as Line,
  XAxisWrapper as XAxis,
  YAxisWrapper as YAxis,
  ChartTooltip,
  ChartTooltipContent,
  ChartTooltipItem,
};
