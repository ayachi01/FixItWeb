// src/pages/MyAssignedTicketsPage.tsx
import { useEffect, useState } from "react";
import TicketCard from "../../components/TicketCard";
import type { Ticket } from "../../api/ticket";
import { api } from "../../api/client"; // axios instance

export default function MyAssignedTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignedTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<Ticket[]>("/tickets/assigned/");
      setTickets(response.data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load assigned tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedTickets();
  }, []);

  if (loading) return <p className="text-center mt-4">Loading tickets...</p>;
  if (error) return <p className="text-center mt-4 text-red-500">{error}</p>;
  if (tickets.length === 0)
    return <p className="text-center mt-4">No assigned tickets.</p>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold mb-4">My Assigned Tickets</h2>
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
      <button
        onClick={fetchAssignedTickets}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Refresh
      </button>
    </div>
  );
}
