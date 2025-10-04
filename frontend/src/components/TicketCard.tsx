// 📂 src/components/TicketCard.tsx
import type { Ticket } from "../api/ticket";

interface Props {
  ticket: Ticket;
}

export default function TicketCard({ ticket }: Props) {
  const canResolve =
    ticket.can_fix && ["ASSIGNED", "REOPENED"].includes(ticket.status);
  const canReopen = ticket.can_fix && ticket.status === "RESOLVED";

  const statusColor: Record<Ticket["status"], string> = {
    CREATED: "bg-gray-400",
    ASSIGNED: "bg-yellow-500",
    IN_PROGRESS: "bg-blue-500",
    NEEDS_ASSISTANCE: "bg-purple-500",
    RESOLVED: "bg-green-500",
    CLOSED: "bg-gray-700",
    REOPENED: "bg-orange-500",
  };

  const urgencyColor: Record<Ticket["urgency"], string> = {
    STANDARD: "bg-gray-300",
    URGENT: "bg-red-500",
  };

  const escalationColor: Record<Ticket["escalation_level"], string> = {
    NONE: "bg-gray-300",
    SECONDARY: "bg-yellow-600",
    ADMIN: "bg-red-700",
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

  return (
    <div className="border rounded-lg p-4 shadow hover:shadow-lg transition duration-200 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg">{ticket.title}</h3>
        <div className="flex gap-1 flex-wrap">
          <span
            className={`px-2 py-1 rounded text-white text-xs ${
              statusColor[ticket.status]
            }`}
          >
            {ticket.status.replace("_", " ")}
          </span>
          <span
            className={`px-2 py-1 rounded text-white text-xs ${
              urgencyColor[ticket.urgency]
            }`}
          >
            {ticket.urgency}
          </span>
          <span
            className={`px-2 py-1 rounded text-white text-xs ${
              escalationColor[ticket.escalation_level]
            }`}
          >
            {ticket.escalation_level.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="text-sm text-gray-600 space-y-1 mb-3">
        <p>
          <strong>Category:</strong> {ticket.category}
        </p>
        <p>
          <strong>Location:</strong> {ticket.location_name || "N/A"}
        </p>
        <p>
          <strong>Reporter:</strong> {ticket.reporter?.full_name || "N/A"}
        </p>
        <p>
          <strong>Assignees:</strong>{" "}
          {ticket.assignees && ticket.assignees.length > 0
            ? ticket.assignees.map((a) => a.full_name).join(", ")
            : "None"}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap mb-3">
        {canResolve && (
          <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition">
            Resolve
          </button>
        )}
        {canReopen && (
          <button className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition">
            Reopen
          </button>
        )}
        <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
          Upload Proof
        </button>
        <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition">
          View Details
        </button>
      </div>

      {/* Images */}
      {ticket.images && ticket.images.length > 0 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {ticket.images.map((img, idx) => (
            <img
              key={idx}
              src={img.image_url}
              alt={`Ticket ${ticket.id} Image ${idx + 1}`}
              className="h-20 w-20 object-cover rounded border"
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-2">No images uploaded.</p>
      )}

      {/* Timestamps */}
      <p className="text-xs text-gray-400 mt-3">
        Created: {formatDate(ticket.created_at)} | Updated:{" "}
        {formatDate(ticket.updated_at)}
      </p>
    </div>
  );
}
