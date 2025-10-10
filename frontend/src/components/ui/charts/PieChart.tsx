interface PieChartProps {
  data: Record<string, number>;
  title: string;
}

export default function PieChart({ data, title }: PieChartProps) {
  return (
    <div className="border rounded p-4">
      <h3>{title}</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
