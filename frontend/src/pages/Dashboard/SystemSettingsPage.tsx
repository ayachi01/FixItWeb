import React, { useEffect, useState } from "react";
import { api } from "../../api/client";

interface Role {
  id: number;
  name: string;
  description: string;
}

export default function SettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Fetch Roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const res = await api.get("/roles/"); // Adjust to your backend endpoint
        setRoles(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">⚙️ System Settings</h1>
      <p className="mb-6 text-gray-700">
        Manage categories, permissions, roles, and other system-wide settings.
      </p>

      {/* 🗂️ Categories Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">📁 Categories</h2>
        <p className="mb-4 text-gray-600">
          View, add, or edit system categories.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-gray-500 italic">Category management coming soon...</p>
        </div>
      </section>

      {/* 🔐 Permissions Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">🔒 Permissions</h2>
        <p className="mb-4 text-gray-600">
          Manage roles and access permissions for users.
        </p>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-gray-500 italic">Permission settings coming soon...</p>
        </div>
      </section>

      {/* 🛡️ Roles Management Section (moved from RolesPage.tsx) */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">🛡️ Roles Management</h2>

        {loading ? (
          <p className="p-2 text-gray-600">Loading roles...</p>
        ) : error ? (
          <p className="p-2 text-red-500">{error}</p>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border-b">ID</th>
                  <th className="p-3 border-b">Role Name</th>
                  <th className="p-3 border-b">Description</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 border-b">
                    <td className="p-3">{role.id}</td>
                    <td className="p-3 font-medium">{role.name}</td>
                    <td className="p-3 text-gray-600">
                      {role.description || "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ⚙️ Other Settings */}
      <section>
        <h2 className="text-xl font-semibold mb-2">🧩 Other Settings</h2>
        <p className="text-gray-600">Configure additional system-wide settings.</p>
      </section>
    </div>
  );
}
