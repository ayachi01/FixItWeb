import { api } from "./client";

// Fetch system settings
export async function getSettings() {
  const res = await api.get("/settings/");
  return res.data;
}

// Update system settings
export async function updateSettings(data: Record<string, any>) {
  const res = await api.patch("/settings/", data);
  return res.data;
}
