// src/pages/MyReportsPage.tsx
import { useEffect, useState } from "react";
import api from "../api/client";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
}

export default function MyReportsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await api.get("/tickets/my-tickets/");
        setTickets(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  if (loading) return <p>Loading tickets...</p>;
  if (!tickets.length) return <p>No tickets found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📄 My Reports</h1>
      <ul className="space-y-2">
        {tickets.map((t) => (
          <li key={t.id} className="p-3 border rounded bg-white">
            <h2 className="font-semibold">{t.title}</h2>
            <p>{t.description}</p>
            <p className="text-sm text-gray-500">Status: {t.status}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
