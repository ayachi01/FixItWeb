import { api } from "./client";

// Fetch all roles
export async function getAllRoles() {
  const res = await api.get("/roles/");
  return res.data;
}

// Fetch single role
export async function getRoleById(id: number) {
  const res = await api.get(`/roles/${id}/`);
  return res.data;
}

// Create role
export async function createRole(data: {
  name: string;
  description: string;
  permissions: number[]; // array of permission IDs
}) {
  const res = await api.post("/roles/", data);
  return res.data;
}

// Update role
export async function updateRole(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    permissions: number[];
  }>
) {
  const res = await api.patch(`/roles/${id}/`, data);
  return res.data;
}

// Delete role
export async function deleteRole(id: number) {
  const res = await api.delete(`/roles/${id}/`);
  return res.data;
}
