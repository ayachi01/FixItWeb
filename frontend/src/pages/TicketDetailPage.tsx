// src/pages/TicketDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import { useAuthStore } from "../store/authStore";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  assigned_to?: string;
  created_by: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTicket() {
      setLoading(true);
      try {
        const res = await api.get(`/tickets/${id}/`);
        setTicket(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load ticket");
      } finally {
        setLoading(false);
      }
    }
    fetchTicket();
  }, [id]);

  if (loading) return <p>Loading ticket...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!ticket) return <p>Ticket not found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Ticket #{ticket.id}</h1>
      <p>
        <strong>Title:</strong> {ticket.title}
      </p>
      <p>
        <strong>Description:</strong> {ticket.description}
      </p>
      <p>
        <strong>Status:</strong> {ticket.status}
      </p>
      <p>
        <strong>Created by:</strong> {ticket.created_by}
      </p>
      {ticket.assigned_to && (
        <p>
          <strong>Assigned to:</strong> {ticket.assigned_to}
        </p>
      )}

      {/* Example: Only Admin or Staff can see "Update Status" */}
      {user?.features.includes("updateStatus") && (
        <button className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
          Update Status
        </button>
      )}
    </div>
  );
}
