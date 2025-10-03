// 📂 src/pages/tickets/AssignedTicketsPage.tsx
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
  assignees: Assignee[];
  images: TicketImage[];
}

export default function AssignedTicketsPage() {
  const { access, user } = useAuthStore();
  const permissions = user?.permissions;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffOptions, setStaffOptions] = useState<Record<number, Assignee[]>>(
    {}
  );

  // Only users who can assign tickets can access this page
  if (!permissions?.can_assign) {
    return (
      <p className="text-red-500">
        ❌ You do not have permission to assign tickets.
      </p>
    );
  }

  // Fetch unassigned tickets + eligible fixers
  useEffect(() => {
    if (!access) return;

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
        console.log("Normalized tickets:", normalizedTickets);

        setTickets(normalizedTickets);

        // Fetch eligible fixers for each ticket
        const staffPromises = normalizedTickets.map(async (ticket) => {
          try {
            const staffRes = await api.get<Assignee[]>(
              `/tickets/${ticket.id}/eligible_fixers/`,
              {
                headers: { Authorization: `Bearer ${access}` },
              }
            );
            console.log(
              `Eligible fixers for ticket ${ticket.id}:`,
              staffRes.data
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
        console.log("Staff options dict:", staffDict);
        setStaffOptions(staffDict);
      } catch (err) {
        console.error("❌ Failed fetching tickets:", err);
        toast.error("Failed to load unassigned tickets.");
      } finally {
        setLoading(false);
        console.log("🔹 Finished fetching tickets, loading=false");
      }
    };

    fetchTickets();
  }, [access]);

  const handleAssign = async (ticketId: number, staffId?: number) => {
    if (!staffId) return;
    console.log(`🔹 Assigning ticket ${ticketId} to staff ${staffId}...`);

    try {
      await api.post(
        `/tickets/${ticketId}/assign/`,
        { assignee_id: staffId },
        {
          headers: { Authorization: `Bearer ${access}` },
        }
      );
      toast.success(`✅ Ticket ${ticketId} assigned successfully!`);

      // Remove ticket from list after assignment
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    } catch (err: any) {
      console.error(`❌ Failed assigning ticket ${ticketId}:`, err);
      toast.error(err.response?.data?.error || "Failed to assign ticket.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">📝 Assign Tickets</h1>

      {loading ? (
        <p>Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p>No unassigned tickets available.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 border rounded-lg shadow-sm bg-gray-50"
            >
              <h2 className="text-lg font-semibold">{ticket.title}</h2>
              <p className="text-gray-600">{ticket.description}</p>
              <p className="text-sm text-gray-500">
                {ticket.location_name} •{" "}
                {new Date(ticket.created_at).toLocaleString()}
              </p>
              <p className="text-sm mt-1 font-medium">
                Category: {ticket.category}
              </p>

              <div className="mt-2">
                <select
                  defaultValue=""
                  className="border p-1 rounded"
                  onChange={(e) =>
                    handleAssign(ticket.id, Number(e.target.value))
                  }
                >
                  <option value="" disabled>
                    Select staff to assign
                  </option>
                  {(staffOptions[ticket.id] || []).map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name} ({staff.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
