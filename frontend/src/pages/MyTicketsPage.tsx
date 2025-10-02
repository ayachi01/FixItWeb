// 📂 src/pages/tickets/MyReportsPage.tsx
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { api } from "../api/client";
import { toast } from "react-hot-toast";

interface TicketImage {
  image_url: string;
}

interface Assignee {
  id: number;
  full_name: string;
  email: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  category: string;
  urgency: string;
  escalation_level: string;
  location_name: string;
  created_at: string;
  assignees: Assignee[];
  images: TicketImage[];
}

export default function MyReportsPage() {
  const { access } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Fetch user's tickets
  useEffect(() => {
    if (!access) return;

    const fetchTickets = async () => {
      try {
        setLoading(true);
        const res = await api.get("/tickets/my_reports/", {
          headers: { Authorization: `Bearer ${access}` },
        });

        // Normalize API response to avoid undefined fields
        const normalizedTickets = res.data.map((t: any) => ({
          ...t,
          images: t.images || [],
          assignees: t.assignees || [],
        }));

        setTickets(normalizedTickets);
      } catch (err) {
        console.error(err);
        toast.error("❌ Failed to load your tickets.");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [access]);

  const statusColor = (status: string) => {
    switch (status) {
      case "Created":
        return "bg-gray-200 text-gray-800";
      case "Assigned":
      case "In Progress":
        return "bg-blue-200 text-blue-800";
      case "Needs Assistance":
        return "bg-yellow-200 text-yellow-800";
      case "Resolved":
        return "bg-green-200 text-green-800";
      case "Closed":
        return "bg-gray-400 text-white";
      case "Reopened":
        return "bg-red-200 text-red-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const urgencyColor = (urgency: string) =>
    urgency === "Urgent"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800";

  const escalationColor = (level: string) => {
    switch (level) {
      case "Secondary":
        return "bg-yellow-100 text-yellow-800";
      case "Admin":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">📄 My Tickets</h1>

      {loading ? (
        <p>Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p>You have not reported any tickets yet.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg shadow-sm cursor-pointer hover:bg-gray-50"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex items-start sm:items-center space-x-4 w-full">
                {/* Images */}
                <div className="flex space-x-2 overflow-x-auto">
                  {(ticket.images || []).map((img, idx) => (
                    <img
                      key={idx}
                      src={img.image_url}
                      alt={`${ticket.title}-${idx}`}
                      className="w-20 h-20 object-cover rounded"
                    />
                  ))}
                </div>

                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{ticket.title}</h2>
                  <p className="text-gray-600 text-sm">{ticket.description}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {ticket.location_name} •{" "}
                    {new Date(ticket.created_at).toLocaleString()}
                  </p>

                  {(ticket.assignees || []).length > 0 && (
                    <p className="text-sm mt-1 text-gray-700">
                      Assigned to:{" "}
                      {(ticket.assignees || [])
                        .map((a) => a.full_name)
                        .join(", ")}
                    </p>
                  )}

                  <p className="text-sm mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${escalationColor(
                        ticket.escalation_level
                      )}`}
                    >
                      Escalation: {ticket.escalation_level}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-2 sm:mt-0 flex flex-col items-end space-y-1">
                <span
                  className={`px-2 py-1 rounded-full text-sm font-semibold ${statusColor(
                    ticket.status
                  )}`}
                >
                  {ticket.status}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-sm font-semibold ${urgencyColor(
                    ticket.urgency
                  )}`}
                >
                  {ticket.category} • {ticket.urgency}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------ Ticket Modal ------------------ */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg w-11/12 max-w-3xl p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 font-bold"
              onClick={() => setSelectedTicket(null)}
            >
              ✖
            </button>
            <h2 className="text-xl font-bold mb-4">{selectedTicket.title}</h2>
            <p className="text-gray-600 mb-2">{selectedTicket.description}</p>
            <p className="text-gray-500 text-xs mb-2">
              {selectedTicket.location_name} •{" "}
              {new Date(selectedTicket.created_at).toLocaleString()}
            </p>

            <div className="flex flex-wrap gap-2 mb-2">
              {(selectedTicket.assignees || []).map((a) => (
                <span
                  key={a.id}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                >
                  {a.full_name}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {(selectedTicket.images || []).map((img, idx) => (
                <img
                  key={idx}
                  src={img.image_url}
                  alt={`${selectedTicket.title}-${idx}`}
                  className="w-24 h-24 object-cover rounded"
                />
              ))}
            </div>

            <div className="flex gap-2 mt-2 flex-wrap">
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(
                  selectedTicket.status
                )}`}
              >
                {selectedTicket.status}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${urgencyColor(
                  selectedTicket.urgency
                )}`}
              >
                {selectedTicket.category} • {selectedTicket.urgency}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${escalationColor(
                  selectedTicket.escalation_level
                )}`}
              >
                Escalation: {selectedTicket.escalation_level}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
