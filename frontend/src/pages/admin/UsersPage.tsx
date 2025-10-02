// 📂 src/pages/admin/UsersPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { Edit, Trash2, Plus } from "lucide-react";
import { toast } from "react-hot-toast";

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface User {
  id: number;
  email: string;
  role: Role | null;
  is_email_verified: boolean;
  full_name?: string;
  status?: "active" | "inactive";
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthorized =
    currentUser?.permissions.is_admin_level ||
    currentUser?.permissions.can_manage_users;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async () => {
    if (!isAuthorized) return;

    try {
      setLoading(true);
      const res = await api.get("/users/", { params: { page } });

      const data = res.data;
      if (Array.isArray(data)) {
        // Backend returns plain array
        setUsers(data);
        setTotalPages(1);
      } else {
        // Backend returns paginated response
        setUsers(data.results || []);
        setTotalPages(data.total_pages || 1);
      }

      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) {
      navigate("/dashboard");
      return;
    }
    fetchUsers();
  }, [isAuthorized, navigate, fetchUsers, location.key]);

  const handleEdit = (id: number) => {
    navigate(`/admin/users/${id}`);
  };

  const handleCreate = () => {
    navigate("/admin/users/create");
  };

  const handleDelete = async (id: number) => {
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) return;

    if (
      !window.confirm(
        `Are you sure you want to delete "${
          userToDelete.full_name || userToDelete.email
        }"?`
      )
    )
      return;

    try {
      setDeletingId(id);
      await api.delete(`/users/${id}/`);
      setUsers(users.filter((u) => u.id !== id));
      toast.success("User deleted successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrevPage = () => setPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setPage((p) => Math.min(p + 1, totalPages));

  if (!isAuthorized) return <p className="p-4 text-red-500">Not authorized</p>;
  if (loading) return <p className="p-4">Loading users...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">👥 Manage Users</h1>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          <Plus size={16} className="mr-1" /> Create User
        </button>
      </div>

      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border-b">ID</th>
              <th className="p-2 border-b">Full Name</th>
              <th className="p-2 border-b">Email</th>
              <th className="p-2 border-b">Role</th>
              <th className="p-2 border-b">Verified</th>
              <th className="p-2 border-b">Status</th>
              <th className="p-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{u.id}</td>
                <td className="p-2">{u.full_name || "--"}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role?.name || "--"}</td>
                <td className="p-2">{u.is_email_verified ? "✅" : "❌"}</td>
                <td className="p-2">{u.status || "active"}</td>
                <td className="p-2 flex space-x-2">
                  <button
                    onClick={() => handleEdit(u.id)}
                    className="flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    <Edit size={16} className="mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    disabled={deletingId === u.id}
                    className={`flex items-center px-2 py-1 rounded ${
                      deletingId === u.id
                        ? "bg-red-300 text-white cursor-not-allowed"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {deletingId === u.id ? (
                      <span className="animate-spin mr-1 border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                    ) : (
                      <Trash2 size={16} className="mr-1" />
                    )}
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
