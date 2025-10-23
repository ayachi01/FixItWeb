// src/pages/Dashboard/ReportsPage.tsx
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  ComposedChart,
} from "recharts";

// Generic base interface for Recharts compatibility
interface ChartFriendly {
  [key: string]: string | number | null | undefined;
}

interface Overview {
  total_tickets: number;
  resolved: number;
  open: number;
  completion_rate: number;
  avg_resolution_hours: number | null;
}

interface StatusSummary extends ChartFriendly {
  status: string;
  count: number;
}

interface Trend extends ChartFriendly {
  month: string;
  count: number;
}

interface Category extends ChartFriendly {
  category: string;
  count: number;
}

interface Location extends ChartFriendly {
  location__building_name: string;
  count: number;
}

interface FixerPerformance extends ChartFriendly {
  assignments__user__email: string;
  resolved_count: number;
  avg_time_hours?: number;
}

interface AnalyticsData {
  overview: Overview;
  status_summary: StatusSummary[];
  monthly_trend: Trend[];
  top_locations: Location[];
  top_categories: Category[];
  fixer_performance: FixerPerformance[];
}

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AnalyticsData>("/tickets/analytics/")
      .then((res) => {
        console.log("✅ Analytics loaded:", res.data);
        setData(res.data);
      })
      .catch((err) => {
        console.error("❌ Failed to load analytics:", err);
        setError("Failed to load analytics data.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6 text-gray-500">Loading analytics...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!data) return <p className="p-6 text-gray-500">No analytics data.</p>;

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c"];

  const formatMonth = (dateString: string) =>
    new Date(dateString).toLocaleString("default", {
      month: "short",
      year: "2-digit",
    });

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-10">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Reports Dashboard
      </h1>



      {/* --- Ticket Status Summary (Pie Chart) --- */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Tickets by Status</h2>
        {data.status_summary.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.status_summary}
                dataKey="count"
                nameKey="status"
                outerRadius={120}
                label
              >
                {data.status_summary.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400">No status data available.</p>
        )}
      </div>

      {/* --- Monthly Trends (Line Chart) --- */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Ticket Trends</h2>
        {data.monthly_trend.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data.monthly_trend.map((d) => ({
                ...d,
                month: formatMonth(d.month),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400">No monthly trend data available.</p>
        )}
      </div>

      {/* --- Top Categories (Vertical Bar Chart) --- */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Top 5 Categories</h2>
        {data.top_categories.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.top_categories}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#16a34a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400">No category data available.</p>
        )}
      </div>

      {/* --- Top Locations (Horizontal Bar Chart) --- */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Top 5 Locations</h2>
        {data.top_locations.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              layout="vertical"
              data={data.top_locations}
              margin={{ left: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                dataKey="location__building_name"
                type="category"
                width={150}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#fbbf24" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400">No location data available.</p>
        )}
      </div>

      {/* --- Fixer Performance (Composed Chart: Bar + Line) --- */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Fixer Performance (Resolved vs Avg Time)
        </h2>
        {data.fixer_performance.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.fixer_performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="assignments__user__email" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="resolved_count"
                fill="#fb923c"
                name="Resolved Tickets"
                radius={[6, 6, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="avg_time_hours"
                stroke="#1d4ed8"
                strokeWidth={2}
                name="Avg Time (hrs)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400">No fixer performance data available.</p>
        )}
      </div>
    </div>
  );
}
