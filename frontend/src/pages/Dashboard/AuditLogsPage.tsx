// 📂 src/pages/Dashboard/AuditLogsPage.tsx
import { useEffect, useState } from "react";
import { api } from "../../api/client";

interface AuditLog {
  id: number;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  details?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>("All");
  const [selectedDate, setSelectedDate] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Fetch Logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get("/audit-logs/");
        const data: AuditLog[] = res.data;

        setLogs(data);
        setFilteredLogs(data);

        // 🧩 Extract unique actions
        const uniqueActions = Array.from(new Set(data.map((log) => log.action)));
        setActions(uniqueActions);

        // 📅 Extract unique dates (yyyy-mm-dd)
        const uniqueDates = Array.from(
          new Set(
            data.map((log) =>
              new Date(log.timestamp).toISOString().split("T")[0]
            )
          )
        ).sort((a, b) => (a < b ? 1 : -1)); // sort by newest first
        setDates(uniqueDates);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // 🔹 Filter Logic (Action + Date combined)
  useEffect(() => {
    let filtered = [...logs];

    if (selectedAction !== "All") {
      filtered = filtered.filter((log) => log.action === selectedAction);
    }

    if (selectedDate !== "All") {
      filtered = filtered.filter(
        (log) =>
          new Date(log.timestamp).toISOString().split("T")[0] === selectedDate
      );
    }

    setFilteredLogs(filtered);
  }, [selectedAction, selectedDate, logs]);

  if (loading) return <p className="p-4">Loading audit logs...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">📜 Audit Logs</h1>

      {/* 🔽 Filter Section */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Action Filter */}
        <div>
          <label
            htmlFor="actionFilter"
            className="text-gray-700 font-medium mr-2"
          >
            Action:
          </label>
          <select
            id="actionFilter"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label
            htmlFor="dateFilter"
            className="text-gray-700 font-medium mr-2"
          >
            Date:
          </label>
          <select
            id="dateFilter"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            {dates.map((date) => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 🧾 Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">User</th>
              <th className="p-2">Action</th>
              <th className="p-2">Target</th>
              <th className="p-2">Timestamp</th>
              <th className="p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{log.id}</td>
                  <td className="p-2">{log.user}</td>
                  <td className="p-2 font-medium text-blue-600">{log.action}</td>
                  <td className="p-2">{log.target}</td>
                  <td className="p-2">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-2">{log.details || "--"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No logs found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
