// 📂 src/pages/Dashboard/InvitesListPage.tsx
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { toast } from "react-hot-toast";
import { Loader2, RefreshCw, Trash2, Mail } from "lucide-react";

interface Invite {
  id: number;
  email: string;
  role: number | null;
  role_name: string;
  created_by_email: string | null;
  created_at: string;
  expires_at: string;
  is_used: boolean;
  expired: boolean;
  status_label: string;
}

export default function InvitesListPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null); // track which invite action is running

  // Fetch all invites
  const fetchInvites = async () => {
    try {
      const res = await api.get("/invites/");
      const mapped = res.data.map((invite: any) => ({
        ...invite,
        status_label: invite.status_label || computeStatus(invite),
      }));
      setInvites(mapped);
    } catch (err) {
      toast.error("Failed to load invites");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  // Delete Invite - instant removal from UI
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this invite?")) return;

    const originalInvites = [...invites];
    setInvites((prev) => prev.filter((invite) => invite.id !== id));
    setActionLoading(id);

    try {
      await api.delete(`/invites/${id}/`);
      toast.success("Invite deleted");
    } catch (err) {
      setInvites(originalInvites);
      toast.error("Failed to delete invite");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Resend Invite - instant UX
  const handleResend = async (id: number) => {
    const originalInvites = [...invites];

    // Optimistic UI: mark invite as "Used" temporarily or keep status same
    // Here, just keep UI feedback with loader
    setActionLoading(-1);

    try {
      await api.post(`/invites/${id}/resend/`);
      toast.success("Invite resent successfully");
      // Optionally, refresh only the specific invite if backend changes
      fetchInvites();
    } catch (err) {
      setInvites(originalInvites);
      toast.error("Failed to resend invite");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Compute status label safely for frontend
  const computeStatus = (invite: any) => {
    if (invite.is_used) return "Used";
    const expired = invite.expired || new Date(invite.expires_at) < new Date();
    if (expired) return "Expired";
    return "Pending";
  };

  // Map status_label to color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Used":
        return "bg-green-100 text-green-700";
      case "Expired":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700"; // Pending
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-600">Loading invites...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Invites List</h1>
          <p className="text-gray-500 text-sm">
            Manage all pending and used invites
          </p>
        </div>
        <button
          onClick={() => {
            setRefreshing(true);
            fetchInvites();
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Created By</th>
              <th className="px-6 py-3">Created At</th>
              <th className="px-6 py-3">Expires At</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {invites.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">
                  No invites found.
                </td>
              </tr>
            ) : (
              invites.map((invite) => {
                const statusColor = getStatusColor(invite.status_label);

                return (
                  <tr
                    key={invite.id}
                    className="hover:bg-gray-50 transition-all"
                  >
                    <td className="px-6 py-3 font-medium text-gray-800">
                      {invite.email}
                    </td>
                    <td className="px-6 py-3">{invite.role_name || "—"}</td>
                    <td className="px-6 py-3">
                      {invite.created_by_email || "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(invite.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(invite.expires_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}
                      >
                        {invite.status_label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3 text-center space-x-2">
                      {invite.status_label === "Pending" && (
                        <button
                          onClick={() => handleResend(invite.id)}
                          disabled={actionLoading === -1}
                          className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === -1 ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                          Resend
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(invite.id)}
                        disabled={actionLoading === invite.id}
                        className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === invite.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
