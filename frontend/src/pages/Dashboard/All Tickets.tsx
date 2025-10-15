import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../api/client";
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
  images: TicketImage[];
  assignees: Assignee[];
}

export default function DashboardMain() {
  const { access } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [staffOptions, setStaffOptions] = useState<Record<number, Assignee[]>>(
    {}
  );
  const [selectedUrgency, setSelectedUrgency] = useState<
    Record<number, string>
  >({});
  const [loading, setLoading] = useState(false);

  // ✅ Fetch unassigned tickets
  const fetchTickets = async () => {
    console.log("🔹 Fetching unassigned tickets...");
    setLoading(true);

    try {
      const res = await api.get("/tickets/unassigned/", {
        headers: { Authorization: `Bearer ${access}` },
      });
      console.log("Raw API response:", res.data);

      const normalizedTickets: Ticket[] = (res.data || []).map((t: any) => ({
        id: t.id,
        title: t.title || "No Title",
        description: t.description || "No Description",
        status: t.status || "Created",
        category: t.category || "General",
        urgency: t.urgency || "Normal",
        escalation_level: t.escalation_level || "None",
        location_name: t.location_name || "Unknown Location",
        created_at: t.created_at || new Date().toISOString(),
        images: t.images || [],
        assignees: t.assignees || [],
      }));

      // 🕓 Sort tickets by date (most recent first)
      const sortedTickets = normalizedTickets.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTickets(sortedTickets);

      // Initialize urgency per ticket
      const urgencyDict: Record<number, string> = {};
      sortedTickets.forEach((t) => {
        urgencyDict[t.id] = t.urgency;
      });
      setSelectedUrgency(urgencyDict);

      // Fetch eligible fixers for each ticket
      const staffPromises = sortedTickets.map(async (ticket) => {
        try {
          const staffRes = await api.get<Assignee[]>(
            `/tickets/${ticket.id}/eligible_fixers/`,
            {
              headers: { Authorization: `Bearer ${access}` },
            }
          );
          return { ticketId: ticket.id, staff: staffRes.data };
        } catch (err) {
          console.error(
            `❌ Failed fetching eligible fixers for ticket ${ticket.id}`,
            err
          );
          return { ticketId: ticket.id, staff: [] };
        }
      });

      const staffResults = await Promise.all(staffPromises);
      const staffDict: Record<number, Assignee[]> = {};
      staffResults.forEach(({ ticketId, staff }) => {
        staffDict[ticketId] = staff;
      });
      setStaffOptions(staffDict);
    } catch (err) {
      console.error("❌ Failed fetching tickets:", err);
      toast.error("Failed to load unassigned tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // ✅ Assign ticket handler
  const handleAssign = async (ticketId: number, assigneeId: number) => {
    try {
      await api.post(
        `/tickets/${ticketId}/assign/`,
        { assignee_id: assigneeId },
        { headers: { Authorization: `Bearer ${access}` } }
      );
      toast.success("Ticket assigned successfully!");
      fetchTickets(); // Refresh list
    } catch (err) {
      console.error("❌ Error assigning ticket:", err);
      toast.error("Failed to assign ticket.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">🎫 Unassigned Tickets</h1>

      {loading ? (
        <p className="text-gray-500">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="text-gray-500">No unassigned tickets available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="border border-gray-200 p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold text-gray-800">
                {ticket.title}
              </h2>
              <p className="text-gray-600 text-sm mb-2">
                {ticket.description}
              </p>

              <div className="text-xs text-gray-500 mb-2">
                <p>
                  <strong>Category:</strong> {ticket.category}
                </p>
                <p>
                  <strong>Location:</strong> {ticket.location_name}
                </p>
                <p>
                  <strong>Created:</strong>{" "}
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>

              <div className="mb-2">
                <label className="text-sm font-medium">Assign to:</label>
                <select
                  onChange={(e) =>
                    handleAssign(ticket.id, Number(e.target.value))
                  }
                  defaultValue=""
                  className="w-full border border-gray-300 rounded p-1 mt-1"
                >
                  <option value="" disabled>
                    Select staff
                  </option>
                  {staffOptions[ticket.id]?.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2">
                <span
                  className={`px-2 py-1 text-xs rounded ${ticket.urgency === "High"
                      ? "bg-red-100 text-red-600"
                      : ticket.urgency === "Medium"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-green-100 text-green-600"
                    }`}
                >
                  {ticket.urgency} Urgency
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
