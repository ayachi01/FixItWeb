// src/pages/admin/TicketDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";

interface TicketDetail {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  urgency: string;
  escalation_level: string;
  assignees: { id: number; full_name: string }[];
  images: { id: number; image_url: string }[];
  created_at: string;
  updated_at: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/tickets/${id}/`);
        setTicket(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load ticket");
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id]);

  if (loading) return <p className="p-4">Loading ticket...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;
  if (!ticket) return <p className="p-4">Ticket not found.</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🎫 Ticket #{ticket.id}</h1>
      <div className="bg-white shadow rounded-lg p-4">
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
          <strong>Urgency:</strong> {ticket.urgency}
        </p>
        <p>
          <strong>Escalation:</strong> {ticket.escalation_level}
        </p>
        <p>
          <strong>Assignees:</strong>{" "}
          {ticket.assignees.length > 0
            ? ticket.assignees.map((a) => a.full_name).join(", ")
            : "--"}
        </p>
        <p>
          <strong>Created At:</strong>{" "}
          {new Date(ticket.created_at).toLocaleString()}
        </p>
        <p>
          <strong>Updated At:</strong>{" "}
          {new Date(ticket.updated_at).toLocaleString()}
        </p>

        <div className="mt-4">
          <h2 className="text-lg font-semibold">Images</h2>
          <div className="flex flex-wrap gap-2">
            {ticket.images.map((img) => (
              <img
                key={img.id}
                src={img.image_url}
                alt={`Ticket #${ticket.id}`}
                className="w-32 h-32 object-cover border rounded"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
