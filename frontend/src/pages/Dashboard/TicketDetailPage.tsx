// 📂 src/pages/Dashboard/TicketDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Ticket } from "../../api/ticket"; // ✅ type-only import
import { api } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { toast } from "react-hot-toast";

// 🎨 Status color mapping
const statusColors: Record<Ticket["status"], string> = {
  CREATED: "bg-gray-100 text-gray-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  NEEDS_ASSISTANCE: "bg-red-100 text-red-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-300 text-gray-900",
  REOPENED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-red-200 text-red-900",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTicket = async () => {
    if (!access || !id) return;
    try {
      setLoading(true);
      const response = await api.get<Ticket>(`/tickets/${id}/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      setTicket(response.data);
    } catch (err: any) {
      console.error(err);
      toast.error("❌ Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Ticket actions
  const handleAction = async (action: "close" | "cancel" | "reopen") => {
    if (!id || !access) return;
    try {
      await api.post(
        `/tickets/${id}/${action}/`,
        {},
        { headers: { Authorization: `Bearer ${access}` } }
      );
      const prettyAction =
        action === "cancel"
          ? "cancelled"
          : action === "close"
          ? "closed"
          : "reopened";
      toast.success(`✅ Ticket ${prettyAction} successfully`);
      fetchTicket(); // refresh
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ Failed to ${action} ticket`);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id, access]);

  if (loading) return <p className="text-center mt-4">Loading ticket...</p>;
  if (!ticket)
    return <p className="text-center mt-4 text-red-500">Ticket not found.</p>;

  // 🔧 Normalize status to uppercase
  const status = ticket.status.toUpperCase() as Ticket["status"];

  return (
    <div className="p-6 max-w-5xl mx-auto mt-8 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">🎟 Ticket #{ticket.id}</h2>
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          ⬅ Back
        </button>
      </div>

      {/* Ticket Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p>
            <span className="font-semibold">Title:</span> {ticket.title}
          </p>
          <p>
            <span className="font-semibold">Submitted By:</span>{" "}
            {ticket.reporter?.full_name || ticket.reporter?.email || "N/A"}
          </p>
          <p>
            <span className="font-semibold">Status:</span>{" "}
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}
            >
              {status.replace(/_/g, " ")}
            </span>
          </p>
          <p>
            <span className="font-semibold">Category:</span> {ticket.category}
          </p>
          <p>
            <span className="font-semibold">Urgency:</span>{" "}
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                ticket.urgency === "URGENT"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {ticket.urgency}
            </span>
          </p>
          <p>
            <span className="font-semibold">Location:</span>{" "}
            {ticket.location_name || "N/A"}
          </p>
        </div>

        <div>
          <p>
            <span className="font-semibold">Created At:</span>{" "}
            {new Date(ticket.created_at).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold">Updated At:</span>{" "}
            {new Date(ticket.updated_at).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold">Assignees:</span>{" "}
            {ticket.assignees.length > 0
              ? ticket.assignees.map((a) => a.full_name).join(", ")
              : "Unassigned"}
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Description</h3>
        <p className="bg-gray-50 p-3 rounded border">{ticket.description}</p>
      </div>

      {/* Images */}
      {ticket.images && ticket.images.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Attached Images</h3>
          <div className="flex flex-wrap gap-4">
            {ticket.images.map((img) => (
              <div key={img.id} className="w-40">
                <img
                  src={img.image_url}
                  alt={`Ticket ${ticket.id} image`}
                  className="rounded border w-full h-28 object-cover"
                />
                <p className="text-xs text-center mt-1 truncate">
                  {img.image_url.split("/").pop()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        {/* Edit only if still active */}
        {status !== "CANCELLED" && status !== "CLOSED" && (
          <button
            onClick={() => navigate(`/dashboard/tickets/${ticket.id}/edit`)}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            ✏️ Edit
          </button>
        )}

        {/* Cancel only if fresh */}
        {(status === "CREATED" || status === "ASSIGNED") && (
          <button
            onClick={() => handleAction("cancel")}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            ❌ Cancel
          </button>
        )}

        {/* Close allowed if not closed/cancelled/resolved */}
        {!["CLOSED", "CANCELLED", "RESOLVED"].includes(status) && (
          <button
            onClick={() => handleAction("close")}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ✅ Close
          </button>
        )}

        {/* Reopen only if closed */}
        {status === "CLOSED" && (
          <button
            onClick={() => handleAction("reopen")}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            🔄 Reopen
          </button>
        )}

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
        >
          🖨 Print / Download
        </button>
      </div>
    </div>
  );
}
