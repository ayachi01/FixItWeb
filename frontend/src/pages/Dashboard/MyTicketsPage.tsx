// 📂 src/pages/Dashboard/MyTicketsPage.tsx
import { useEffect, useState } from "react";
import type { Ticket, TicketStatus } from "../../api/ticket";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// 🎨 Status color mapping
const statusColors: Record<TicketStatus, string> = {
  CREATED: "bg-gray-100 text-gray-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  NEEDS_ASSISTANCE: "bg-red-100 text-red-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-300 text-gray-900",
  REOPENED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-red-200 text-red-900",
};

// Format status for readability
const formatStatus = (status: TicketStatus) => status.replace(/_/g, " "); // "IN_PROGRESS" → "IN PROGRESS"

export default function MyTicketsPage() {
  const { access } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchMyTickets = async () => {
    if (!access) return;
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<Ticket[]>("/tickets/my_reports/", {
        headers: { Authorization: `Bearer ${access}` },
      });

      setTickets(response.data);
    } catch (err: any) {
      console.error(err);
      toast.error("❌ Failed to load your tickets.");
      setError("Failed to load your tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, [access]);

  if (loading) return <p className="text-center mt-4">Loading tickets...</p>;
  if (error) return <p className="text-center mt-4 text-red-500">{error}</p>;
  if (tickets.length === 0)
    return (
      <p className="text-center mt-4">You have not reported any tickets.</p>
    );

  return (
    <div className="p-6 max-w-7xl mx-auto mt-8 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold"> My Tickets</h2>
        <button
          onClick={fetchMyTickets}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-gray-100 text-gray-700 text-left">
            <tr>
              <th className="px-4 py-2 border-b">ID</th>
              <th className="px-4 py-2 border-b">Title</th>
              <th className="px-4 py-2 border-b">Submitted By</th>
              <th className="px-4 py-2 border-b">Status</th>
              <th className="px-4 py-2 border-b">Location</th>
              <th className="px-4 py-2 border-b">Category</th>
              <th className="px-4 py-2 border-b">Urgency</th>
              <th className="px-4 py-2 border-b text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2 border-b">{ticket.id}</td>
                <td className="px-4 py-2 border-b">{ticket.title}</td>
                <td className="px-4 py-2 border-b">
                  {ticket.reporter?.full_name ||
                    ticket.reporter?.email ||
                    "N/A"}
                </td>
                <td className="px-4 py-2 border-b">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${statusColors[ticket.status]
                      }`}
                  >
                    {formatStatus(ticket.status)}
                  </span>
                </td>
                <td className="px-4 py-2 border-b">
                  {ticket.location_name || "N/A"}
                </td>
                <td className="px-4 py-2 border-b">{ticket.category}</td>
                <td className="px-4 py-2 border-b">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${ticket.urgency === "URGENT"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {ticket.urgency}
                  </span>
                </td>
                <td className="px-4 py-2 border-b text-center">
                  <button
                    onClick={() => navigate(`/dashboard/tickets/${ticket.id}`)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    View Details
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
