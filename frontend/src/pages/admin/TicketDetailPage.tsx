// 📂 src/pages/admin/TicketDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  category: string;
  reporter_name: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/tickets/${id}/`);
        setTicket(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load ticket");
        console.error("Error fetching ticket:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTicket();
  }, [id]);

  if (loading) return <p className="p-4">Loading ticket details...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;
  if (!ticket) return <p className="p-4">Ticket not found.</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">📝 Ticket #{ticket.id}</h1>

      <div className="bg-white shadow rounded p-4 space-y-2">
        <p>
          <strong>Title:</strong> {ticket.title}
        </p>
        <p>
          <strong>Description:</strong> {ticket.description}
        </p>
        <p>
          <strong>Category:</strong> {ticket.category}
        </p>
        <p>
          <strong>Status:</strong> {ticket.status}
        </p>
        <p>
          <strong>Reporter:</strong> {ticket.reporter_name}
        </p>
        {ticket.assigned_to && (
          <p>
            <strong>Assigned To:</strong> {ticket.assigned_to}
          </p>
        )}
        <p>
          <strong>Created:</strong>{" "}
          {new Date(ticket.created_at).toLocaleString()}
        </p>
        <p>
          <strong>Updated:</strong>{" "}
          {new Date(ticket.updated_at).toLocaleString()}
        </p>
      </div>

      <button
        onClick={() => navigate("/admin/tickets")}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        ← Back to Tickets
      </button>
    </div>
  );
}
