// 📂 src/pages/tickets/FixerAssignedTicketsPage.tsx
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
  accepted: boolean; // New field to track if the assignment is accepted
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

export default function FixerAssignedTicketsPage() {
  const { access, user } = useAuthStore();
  const permissions = user?.permissions;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  if (!permissions?.can_fix) {
    return (
      <p className="text-red-500">
        You do not have permission to view assigned tickets.
      </p>
    );
  }

  useEffect(() => {
    if (!access) return;

    const fetchAssignedTickets = async () => {
      console.log("🔹 Fetching assigned tickets...");
      try {
        setLoading(true);
        const res = await api.get("/tickets/assigned/", {
          headers: { Authorization: `Bearer ${access}` },
        });
        console.log("Raw API response:", res.data);

        const normalizedTickets = (res.data || []).map((t: any) => ({
          id: t.id,
          title: t.title || "No Title",
          description: t.description || "No Description",
          status: t.status || "Created",
          category: t.category || "General",
          urgency: t.urgency || "Standard",
          escalation_level: t.escalation_level || "None",
          location_name: t.location_name || "Unknown Location",
          created_at: t.created_at || new Date().toISOString(),
          images: t.images || [],
          assignees:
            t.assignees?.map((a: any) => ({
              id: a.id,
              full_name: a.full_name,
              email: a.email,
              accepted: a.accepted, // Track acceptance
            })) || [],
        }));
        console.log("Normalized tickets:", normalizedTickets);
        setTickets(normalizedTickets);
      } catch (err) {
        console.error(err);
        toast.error("❌ Failed to load assigned tickets.");
      } finally {
        setLoading(false);
        console.log("🔹 Finished fetching tickets, loading=false");
      }
    };

    fetchAssignedTickets();
  }, [access]);

  // ---------------- Helpers ----------------
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

  // ---------------- Actions ----------------
  const handleAccept = async (ticketId: number) => {
    try {
      await api.post(
        `/tickets/${ticketId}/accept/`,
        {},
        {
          headers: { Authorization: `Bearer ${access}` },
        }
      );
      toast.success("Ticket accepted!");
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: "In Progress",
                assignees: t.assignees.map((a) =>
                  a.id === user?.id ? { ...a, accepted: true } : a
                ),
              }
            : t
        )
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to accept ticket.");
    }
  };

  const handleResolve = async (
    ticketId: number,
    resolution_note: string,
    proof_image?: File
  ) => {
    try {
      const formData = new FormData();
      formData.append("resolution_note", resolution_note);
      if (proof_image) formData.append("proof_image", proof_image);

      await api.post(`/tickets/${ticketId}/resolve/`, formData, {
        headers: { Authorization: `Bearer ${access}` },
      });
      toast.success("Ticket resolved!");
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: "Resolved" } : t))
      );
      setSelectedTicket(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to resolve ticket.");
    }
  };

  const handleClose = async (ticketId: number) => {
    try {
      await api.post(
        `/tickets/${ticketId}/close/`,
        {},
        {
          headers: { Authorization: `Bearer ${access}` },
        }
      );
      toast.success("Ticket closed!");
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: "Closed" } : t))
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to close ticket.");
    }
  };

  // ---------------- Render ----------------
  return (
    <div className="max-w-5xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">🛠 My Assigned Tickets</h1>

      {loading ? (
        <p>Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p>No tickets assigned to you.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg shadow-sm cursor-pointer hover:bg-gray-50"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex items-start sm:items-center space-x-4 w-full">
                <div className="flex-shrink-0 w-36 h-20 overflow-x-auto flex space-x-2">
                  {(ticket.images || []).map((img, idx) => (
                    <img
                      key={idx}
                      src={img.image_url}
                      alt={`${ticket.title}-${idx}`}
                      className="w-16 h-16 object-cover rounded hover:scale-110 transition-transform duration-200"
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

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onAccept={handleAccept}
          onResolve={handleResolve}
          onCloseTicket={handleClose}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}

// ---------------- Ticket Modal ----------------
interface TicketModalProps {
  ticket: Ticket;
  onClose: () => void;
  onAccept: (ticketId: number) => void;
  onResolve: (
    ticketId: number,
    resolution_note: string,
    proof_image?: File
  ) => void;
  onCloseTicket: (ticketId: number) => void;
  currentUserId?: number;
}

function TicketModal({
  ticket,
  onClose,
  onAccept,
  onResolve,
  onCloseTicket,
  currentUserId,
}: TicketModalProps) {
  const [resolutionNote, setResolutionNote] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);

  // Check if current user has an assignment that is not accepted
  const userAssignment = ticket.assignees.find((a) => a.id === currentUserId);
  const canAccept = userAssignment && !userAssignment.accepted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg w-11/12 max-w-3xl p-6 relative overflow-y-auto max-h-[90vh]">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 font-bold"
          onClick={onClose}
        >
          ✖
        </button>
        <h2 className="text-xl font-bold mb-4">{ticket.title}</h2>
        <p className="text-gray-600 mb-2">{ticket.description}</p>
        <p className="text-gray-500 text-xs mb-2">
          {ticket.location_name} •{" "}
          {new Date(ticket.created_at).toLocaleString()}
        </p>

        <div className="flex flex-wrap gap-2 mb-2">
          {(ticket.assignees || []).map((a) => (
            <span
              key={a.id}
              className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
            >
              {a.full_name}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2">
          {(ticket.images || []).map((img, idx) => (
            <img
              key={idx}
              src={img.image_url}
              alt={`${ticket.title}-${idx}`}
              className="w-full h-24 object-cover rounded"
            />
          ))}
        </div>

        <div className="flex gap-2 mt-2 flex-wrap">
          {canAccept && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => onAccept(ticket.id)}
            >
              Accept
            </button>
          )}
          {ticket.status === "In Progress" && (
            <>
              <textarea
                className="border rounded p-2 w-full"
                placeholder="Resolution note..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
              <input
                type="file"
                onChange={(e) =>
                  e.target.files && setProofImage(e.target.files[0])
                }
              />
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={() =>
                  onResolve(ticket.id, resolutionNote, proofImage || undefined)
                }
              >
                Resolve
              </button>
            </>
          )}
          {ticket.status === "Resolved" && (
            <button
              className="px-4 py-2 bg-gray-700 text-white rounded"
              onClick={() => onCloseTicket(ticket.id)}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
