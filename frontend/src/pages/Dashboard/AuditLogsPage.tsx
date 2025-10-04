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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get("/audit-logs/"); // Adjust to your backend endpoint
        setLogs(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) return <p className="p-4">Loading audit logs...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">📜 Audit Logs</h1>

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
            {logs.map((log) => (
              <tr key={log.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{log.id}</td>
                <td className="p-2">{log.user}</td>
                <td className="p-2">{log.action}</td>
                <td className="p-2">{log.target}</td>
                <td className="p-2">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="p-2">{log.details || "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
