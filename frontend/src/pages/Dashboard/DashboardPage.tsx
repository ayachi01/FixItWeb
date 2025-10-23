// src/pages/Dashboard/ReportsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

interface Reporter {
  id: number;
  full_name: string;
}

interface Assignee {
  id: number;
  full_name: string;
}

interface Ticket {
  id: number;
  title: string;
  category: string;
  urgency: string;
  status: string;
  reporter: Reporter | null;
  assignees: Assignee[];
  created_at: string;
}

interface AnalyticsData {
  overview: Overview;
  status_summary: StatusSummary[];
  monthly_trend: Trend[];
  top_categories: Category[];
}

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<AnalyticsData>("/tickets/analytics/"),
      api.get<Ticket[]>("/tickets/"),
    ])
      .then(([analyticsRes, ticketsRes]) => {
        console.log("✅ Analytics loaded:", analyticsRes.data);
        console.log("✅ Tickets loaded:", ticketsRes.data);
        setData(analyticsRes.data);
        setTickets(ticketsRes.data);
      })
      .catch((err) => {
        console.error("❌ Failed to load:", err);
        setError("Failed to load analytics or tickets data.");
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

  // For now, show all tickets
  const displayedTickets = tickets;

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-10">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Reports Dashboard
      </h1>

      {/* --- Overview KPIs --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Total Tickets",
            value: data.overview.total_tickets,
            color: "bg-blue-600",
          },
          {
            label: "Resolved",
            value: data.overview.resolved,
            color: "bg-green-500",
          },
          {
            label: "Open",
            value: data.overview.open,
            color: "bg-yellow-500",
          },
          {
            label: "Completion Rate",
            value: `${data.overview.completion_rate}%`,
            color: "bg-indigo-500",
          },
          {
            label: "Avg Resolution (hrs)",
            value: data.overview.avg_resolution_hours ?? "N/A",
            color: "bg-purple-500",
          },
        ].map((card, i) => (
          <div
            key={i}
            className={`p-4 text-white rounded-2xl shadow ${card.color}`}
          >
            <p className="text-sm opacity-80">{card.label}</p>
            <h3 className="text-2xl font-bold">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* --- Charts Row: Pie + Line --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>

      {/* --- Bottom Chart: Top Categories --- */}
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

      {/* --- New Table: Ticket Details --- */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <h2 className="text-xl font-semibold p-4 border-b">In Progress</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Title</th>
                <th className="p-2">Category</th>
                <th className="p-2">Status</th>
                <th className="p-2">Reporter</th>
                <th className="p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {displayedTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="p-2">{ticket.id}</td>
                  <td className="p-2">{ticket.title}</td>
                  <td className="p-2">{ticket.category}</td>
                  <td className="p-2">{ticket.status}</td>
                  <td className="p-2">{ticket.reporter?.full_name || "—"}</td>
                  <td className="p-2">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
