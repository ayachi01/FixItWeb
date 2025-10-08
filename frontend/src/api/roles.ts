// 📂 src/api/roles.ts
import { api } from "./client";

// ==============================
// ✅ Role Interface
// ==============================
export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: number[];
  requires_admin_approval?: boolean;
}

// ==============================
// 🔹 Fetch all roles
// ==============================
export async function getAllRoles(): Promise<Role[]> {
  const res = await api.get("/roles/");
  return res.data as Role[];
}

// ==============================
// 🔹 Fetch single role
// ==============================
export async function getRoleById(id: number): Promise<Role> {
  const res = await api.get(`/roles/${id}/`);
  return res.data as Role;
}

// ==============================
// 🔹 Create role
// ==============================
export async function createRole(data: {
  name: string;
  description: string;
  permissions: number[];
}): Promise<Role> {
  const res = await api.post("/roles/", data);
  return res.data as Role;
}

// ==============================
// 🔹 Update role
// ==============================
export async function updateRole(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    permissions: number[];
  }>
): Promise<Role> {
  const res = await api.patch(`/roles/${id}/`, data);
  return res.data as Role;
}

// ==============================
// 🔹 Delete role
// ==============================
export async function deleteRole(id: number): Promise<Role> {
  const res = await api.delete(`/roles/${id}/`);
  return res.data as Role;
}
