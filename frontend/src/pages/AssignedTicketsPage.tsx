// 📂 src/pages/AssignTicketsPage.tsx
import { useEffect, useState } from "react";
import { api } from "../api/client"; // ✅ use named import
import { useAuthStore } from "../store/authStore";

interface Ticket {
  id: number;
  description: string;
  category: string;
  urgency: string;
  status: string;
  location_name?: string;
}

interface Staff {
  id: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role?: string;
  displayName?: string; // <-- added for UI fallback
}

export default function AssignTicketsPage() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [staffOptions, setStaffOptions] = useState<Record<number, Staff[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isStaff = user?.role.toLowerCase() === "staff";

  // Users who can assign tickets
  const canAssign = [
    "admin",
    "super admin",
    "university admin",
    "maintenance officer",
  ].includes(user?.role.toLowerCase() || "");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        if (isStaff) {
          // Staff: fetch assigned tickets
          const res = await api.get<Ticket[]>("/tickets/assigned/");
          setTickets(res.data);
        } else if (canAssign) {
          // Admins and Maintenance Officer: fetch unassigned tickets
          const res = await api.get<Ticket[]>("/tickets/unassigned/");
          setTickets(res.data);

          // ✅ For each ticket, fetch eligible fixers
          const staffPromises = res.data.map(async (ticket) => {
            try {
              const staffRes = await api.get<Staff[]>(
                `/tickets/${ticket.id}/eligible_fixers/`
              );
              return {
                ticketId: ticket.id,
                staff: staffRes.data.map((s) => ({
                  ...s,
                  displayName:
                    s.full_name?.trim() ||
                    `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
                    s.email,
                })),
              };
            } catch (err) {
              console.error(
                `Failed to fetch eligible fixers for ticket ${ticket.id}`
              );
              return { ticketId: ticket.id, staff: [] };
            }
          });

          const staffResults = await Promise.all(staffPromises);

          // Convert array to dictionary: { ticketId: staff[] }
          const staffDict: Record<number, Staff[]> = {};
          staffResults.forEach(({ ticketId, staff }) => {
            staffDict[ticketId] = staff;
          });
          setStaffOptions(staffDict);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load tickets.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isStaff, canAssign]);

  const handleAssign = async (ticketId: number, staffId?: number) => {
    if (!staffId) return;
    try {
      await api.post(`/tickets/${ticketId}/assign/`, { assignee_id: staffId });
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      alert("Ticket assigned successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to assign ticket");
    }
  };

  if (loading) return <p>Loading tickets...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!tickets.length) return <p>No tickets available.</p>;

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-gray-50 rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-4">
        {isStaff ? "🛠️ Assigned Tickets" : "📝 Assign Tickets"}
      </h1>

      <ul className="space-y-4">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="p-4 border rounded bg-white shadow-sm">
            <h2 className="font-semibold text-lg">{ticket.category}</h2>
            {ticket.location_name && (
              <p className="text-sm text-gray-600">{ticket.location_name}</p>
            )}
            <p className="mt-2">{ticket.description}</p>
            <p className="mt-2 text-sm text-gray-500">
              Status: <span className="font-medium">{ticket.status}</span> |
              Urgency: {ticket.urgency}
            </p>

            {/* Assignment dropdown for admins and maintenance officer */}
            {canAssign && (
              <div className="mt-3 flex gap-2 items-center">
                <select
                  defaultValue=""
                  className="border p-1 rounded"
                  onChange={(e) =>
                    handleAssign(ticket.id, Number(e.target.value))
                  }
                >
                  <option value="" disabled>
                    Assign to staff
                  </option>
                  {(staffOptions[ticket.id] || []).map((staff) => (
                    <option key={`staff-${staff.id}`} value={staff.id}>
                      {staff.displayName} ({staff.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Staff actions */}
            {isStaff && (
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-1 bg-green-500 text-white rounded">
                  Accept
                </button>
                <button className="px-3 py-1 bg-blue-500 text-white rounded">
                  Resolve
                </button>
                <button className="px-3 py-1 bg-red-500 text-white rounded">
                  Close
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
