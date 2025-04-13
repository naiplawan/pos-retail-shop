import * as React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ChartContainer = ({ data, options }: { data: any; options: any }) => {
  // Ensure data has the required structure
  const safeData = {
    labels: data?.labels || [],
    datasets: data?.datasets || [],
  };

  return (
    <div className="w-full h-full">
      <Line data={safeData} options={options} />
    </div>
  );
};

export { ChartContainer };
