// 📂 src/components/TicketCard.tsx
import { useState } from "react";
import type { Ticket } from "../api/ticket";
import { api } from "../api/client";
import { toast } from "react-hot-toast";

interface Props {
  ticket: Ticket;
  mode?: "myTickets" | "assigned";
  onUpdate?: () => void; // optional callback after proof upload or resolve
}

export default function TicketCard({
  ticket,
  mode = "assigned",
  onUpdate,
}: Props) {
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const canResolve =
    ticket.can_fix &&
    ["ASSIGNED", "REOPENED"].includes(ticket.status.toUpperCase());
  const canReopen =
    ticket.can_fix && ticket.status.toUpperCase() === "RESOLVED";

  const statusColor: Record<string, string> = {
    CREATED: "bg-gray-400",
    ASSIGNED: "bg-yellow-500",
    IN_PROGRESS: "bg-blue-500",
    NEEDS_ASSISTANCE: "bg-purple-500",
    RESOLVED: "bg-green-500",
    CLOSED: "bg-gray-700",
    REOPENED: "bg-orange-500",
  };

  const urgencyColor: Record<string, string> = {
    STANDARD: "bg-gray-300",
    URGENT: "bg-red-500",
  };

  const escalationColor: Record<string, string> = {
    NONE: "bg-gray-300",
    SECONDARY: "bg-yellow-600",
    ADMIN: "bg-red-700",
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

  // -----------------------------
  // 📤 Handle Proof Upload
  // -----------------------------
  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofImage || !resolutionNote.trim()) {
      toast.error("Please provide both a proof image and a resolution note.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("ticket", String(ticket.id)); // ✅ required by backend
    formData.append("proof_image", proofImage);
    formData.append("resolution_note", resolutionNote);

    try {
      await api.post(`/tickets/${ticket.id}/resolve/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Proof uploaded successfully!");
      setShowProofModal(false);
      setProofImage(null);
      setResolutionNote("");
      onUpdate?.();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.error || "Failed to upload proof. Try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 shadow hover:shadow-lg transition duration-200 bg-white relative">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg">{ticket.title}</h3>
        <div className="flex gap-1 flex-wrap">
          <span
            className={`px-2 py-1 rounded text-white text-xs ${
              statusColor[ticket.status.toUpperCase()]
            }`}
          >
            {ticket.status.replace("_", " ")}
          </span>
          <span
            className={`px-2 py-1 rounded text-white text-xs ${
              urgencyColor[ticket.urgency.toUpperCase()]
            }`}
          >
            {ticket.urgency}
          </span>
          <span
            className={`px-2 py-1 rounded text-white text-xs ${
              escalationColor[ticket.escalation_level.toUpperCase()]
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
      {mode === "assigned" && (
        <div className="flex gap-2 flex-wrap mb-3">
          {canResolve && (
            <button
              onClick={() => setShowProofModal(true)}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Resolve
            </button>
          )}
          {canReopen && (
            <button className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition">
              Reopen
            </button>
          )}
          <button
            onClick={() => setShowProofModal(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Upload Proof
          </button>
          <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition">
            View Details
          </button>
        </div>
      )}

      {mode === "myTickets" && (
        <div className="flex gap-2 flex-wrap mb-3">
          <button
            onClick={() => setShowProofModal(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Upload Proof
          </button>
          <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition">
            View Details
          </button>
        </div>
      )}

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

      {/* Upload Proof Modal */}
      {showProofModal && (
        <div className="absolute inset-0 bg-black bg-opacity-40 flex justify-center items-center z-10">
          <div className="bg-white p-5 rounded-lg w-96 shadow-lg relative">
            <h3 className="text-lg font-semibold mb-3">Upload Proof</h3>
            <form onSubmit={handleUploadProof} className="space-y-3">
              <textarea
                className="w-full border rounded p-2 text-sm"
                placeholder="Enter resolution note..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setProofImage(e.target.files ? e.target.files[0] : null)
                }
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProofModal(false)}
                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Submit Proof"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
