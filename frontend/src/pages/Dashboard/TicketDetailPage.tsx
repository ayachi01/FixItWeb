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
      fetchTicket();
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

  const status = ticket.status.toUpperCase() as Ticket["status"];

  const canEdit = !["CANCELLED", "CLOSED", "RESOLVED"].includes(status);
  const canCancel = ["CREATED", "ASSIGNED"].includes(status);
  const canClose = !["CLOSED", "CANCELLED", "RESOLVED"].includes(status);
  const canReopen = status === "CLOSED";

  const editTooltip = !canEdit
    ? "Cannot edit cancelled, closed, or resolved tickets"
    : "";
  const cancelTooltip = !canCancel
    ? "Can only cancel tickets that are newly created or assigned"
    : "";
  const closeTooltip = !canClose
    ? "Cannot close cancelled, closed, or resolved tickets"
    : "";
  const reopenTooltip = !canReopen ? "Can only reopen closed tickets" : "";

  // ---------------------------
  // Print handler with header/footer
  // ---------------------------
  const handlePrint = () => {
    const printContent = document.getElementById("ticket-print-container");
    if (!printContent) return;

    const style = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          return "";
        }
      })
      .join("\n");

    const now = new Date();
    const dateStr = now.toLocaleString();

    const newWin = window.open("", "_blank", "width=900,height=700");
    if (!newWin) return;

    newWin.document.write(`
      <html>
        <head>
          <title>Ticket #${ticket.id}</title>
          <style>
            ${style}
            body { font-family: sans-serif; padding: 20px; }
            h2, h3 { margin: 0 0 10px 0; }
            p { margin: 5px 0; }
            img { max-width: 100%; height: auto; border-radius: 4px; margin-top: 5px; }
            .status { padding: 2px 6px; border-radius: 4px; font-weight: 500; font-size: 0.8rem; }
            @media print {
              @page { margin: 20mm; }
              body { -webkit-print-color-adjust: exact; }
              header { position: fixed; top: 0; width: 100%; text-align: center; font-weight: bold; margin-bottom: 20px; }
              footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 0.8rem; }
              #ticket-print-container { margin-top: 60px; margin-bottom: 40px; }
            }
          </style>
        </head>
        <body>
          <header>🎟 Ticket #${ticket.id} | Printed: ${dateStr}</header>
          ${printContent.innerHTML}
          <footer>Page 1</footer>
        </body>
      </html>
    `);

    newWin.document.close();
    newWin.focus();
    newWin.print();
    newWin.close();
  };

  return (
    <div className="max-w-5xl mx-auto mt-8">
      {/* ------------------------- */}
      {/* Ticket Content for Print */}
      {/* ------------------------- */}
      <div
        id="ticket-print-container"
        className="p-6 bg-white shadow rounded-lg"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">🎟 Ticket #{ticket.id}</h2>
        </div>

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

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <p className="bg-gray-50 p-3 rounded border">{ticket.description}</p>
        </div>

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
      </div>

      {/* ------------------------- */}
      {/* Action Buttons (NOT printed) */}
      {/* ------------------------- */}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          ⬅ Back
        </button>
        <button
          onClick={() => navigate(`/dashboard/tickets/${ticket.id}/edit`)}
          disabled={!canEdit}
          title={editTooltip}
          className={`px-4 py-2 rounded text-white ${
            canEdit
              ? "bg-yellow-500 hover:bg-yellow-600"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => handleAction("cancel")}
          disabled={!canCancel}
          title={cancelTooltip}
          className={`px-4 py-2 rounded text-white ${
            canCancel
              ? "bg-red-500 hover:bg-red-600"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          ❌ Cancel
        </button>
        <button
          onClick={() => handleAction("close")}
          disabled={!canClose}
          title={closeTooltip}
          className={`px-4 py-2 rounded text-white ${
            canClose
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          ✅ Close
        </button>
        <button
          onClick={() => handleAction("reopen")}
          disabled={!canReopen}
          title={reopenTooltip}
          className={`px-4 py-2 rounded text-white ${
            canReopen
              ? "bg-purple-600 hover:bg-purple-700"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          🔄 Reopen
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
        >
          🖨 Print / Download
        </button>
      </div>
    </div>
  );
}
