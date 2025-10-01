// 📂 src/pages/admin/TicketsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client"; // your axios instance

interface User {
  id: number;
  full_name: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  reporter?: User;
  assignees?: User[];
  created_at: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const res = await api.get("/tickets/"); // backend endpoint

        // Map backend data to match frontend interface
        const formatted = res.data.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          urgency: t.urgency ?? "Standard",
          status: t.status,
          reporter: t.reporter
            ? {
                id: t.reporter.id,
                full_name:
                  t.reporter.first_name || t.reporter.last_name
                    ? `${t.reporter.first_name} ${t.reporter.last_name}`.trim()
                    : t.reporter.email,
              }
            : undefined,
          assignees:
            t.assignments?.map((a: any) => ({
              id: a.user.id,
              full_name:
                a.user.first_name || a.user.last_name
                  ? `${a.user.first_name} ${a.user.last_name}`.trim()
                  : a.user.email,
            })) ?? [],
          created_at: t.created_at,
        }));

        setTickets(formatted);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load tickets");
        console.error("Error fetching tickets:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  if (loading) return <p className="p-4">Loading tickets...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🎫 All Tickets</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Title</th>
              <th className="p-2">Category</th>
              <th className="p-2">Urgency</th>
              <th className="p-2">Status</th>
              <th className="p-2">Reporter</th>
              <th className="p-2">Assignees</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{ticket.id}</td>
                <td className="p-2">{ticket.title}</td>
                <td className="p-2">{ticket.category}</td>
                <td className="p-2">{ticket.urgency}</td>
                <td className="p-2">{ticket.status}</td>
                <td className="p-2">{ticket.reporter?.full_name || "—"}</td>
                <td className="p-2">
                  {ticket.assignees?.length
                    ? ticket.assignees.map((a) => (
                        <span
                          key={a.id}
                          className="inline-block bg-gray-200 px-2 py-1 mr-1 rounded"
                        >
                          {a.full_name}
                        </span>
                      ))
                    : "—"}
                </td>
                <td className="p-2">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
                <td className="p-2">
                  <button
                    onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
