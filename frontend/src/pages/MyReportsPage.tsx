// src/pages/MyReportsPage.tsx
import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  category: string;
  urgency: string;
  escalation_level: string;
  created_at: string;
  images: { id: number; image_url: string }[];
}

export default function MyReportsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        // ✅ Correct backend endpoint
        const res = await api.get("/tickets/my_reports/");
        setTickets(res.data);
      } catch (err) {
        console.error("Failed to fetch tickets:", err);
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
      <ul className="space-y-4">
        {tickets.map((t) => (
          <li key={t.id} className="p-4 border rounded bg-white shadow">
            <h2 className="font-semibold text-lg">{t.title}</h2>
            <p className="text-gray-700">{t.description}</p>

            <div className="mt-2 text-sm text-gray-600">
              <p>
                <strong>Status:</strong> {t.status}
              </p>
              <p>
                <strong>Category:</strong> {t.category}
              </p>
              <p>
                <strong>Urgency:</strong> {t.urgency}
              </p>
              <p>
                <strong>Escalation:</strong> {t.escalation_level}
              </p>
              <p>
                <strong>Reported:</strong>{" "}
                {new Date(t.created_at).toLocaleString()}
              </p>
            </div>

            {t.images?.length > 0 && (
              <div className="mt-3 flex gap-2">
                {t.images.map((img) => (
                  <img
                    key={img.id}
                    src={img.image_url}
                    alt="Ticket evidence"
                    className="w-24 h-24 object-cover rounded"
                  />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
