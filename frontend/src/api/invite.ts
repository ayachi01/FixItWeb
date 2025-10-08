// 📂 src/api/invite.ts
import { api } from "./client";

// ==============================
// 🔹 Invite Interface
// ==============================
export interface Invite {
  id: number;
  email: string;
  token: string;
  role: { id: number; name: string };
  created_by?: { id: number; email: string };
  created_at: string;
  expires_at: string | null;
  is_used: boolean;
  requires_admin_approval: boolean;
  is_approved: boolean;
  approved_by?: { id: number; email: string };
  approved_at?: string | null;
}

// ==============================
// 🔹 Fetch all invites (admin only)
// ==============================
export async function getAllInvites(): Promise<Invite[]> {
  const res = await api.get("/invites/");
  return res.data as Invite[];
}

// ==============================
// 🔹 Validate invite token
// ==============================
export async function inviteValidate(token: string): Promise<Invite> {
  const res = await api.post("/invites/validate/", { token });
  return res.data as Invite;
}

// ==============================
// 🔹 Complete invite registration
// ==============================
export async function registerInvite(
  token: string,
  first_name: string,
  last_name: string,
  password: string,
  confirm_password: string
): Promise<Invite> {
  const res = await api.post("/invites/register/", {
    token,
    first_name,
    last_name,
    password,
    confirm_password,
  });
  return res.data as Invite;
}

// ==============================
// 🔹 Create invite (admin only)
// ==============================
export async function createInvite(data: {
  email: string;
  role: number;
}): Promise<Invite> {
  const res = await api.post("/invites/", data);
  return res.data as Invite;
}

// ==============================
// 🔹 Mark invite as used (optional, mostly backend handled)
// ==============================
export async function markInviteUsed(token: string): Promise<Invite> {
  const res = await api.post(`/invites/${token}/mark_used/`);
  return res.data as Invite;
}
