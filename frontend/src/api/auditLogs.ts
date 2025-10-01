import { api } from "./client";

// Fetch all audit logs
export async function getAllAuditLogs() {
  const res = await api.get("/audit-logs/");
  return res.data;
}

// Fetch single audit log
export async function getAuditLogById(id: number) {
  const res = await api.get(`/audit-logs/${id}/`);
  return res.data;
}
