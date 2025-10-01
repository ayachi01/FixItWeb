import { api } from "./client";

// Fetch all tickets (admin)
export async function getAllTickets() {
  const res = await api.get("/tickets/");
  return res.data;
}

// Fetch single ticket by ID
export async function getTicketById(id: number) {
  const res = await api.get(`/tickets/${id}/`);
  return res.data;
}

// Create a ticket (student)
export async function createTicket(data: {
  title: string;
  description: string;
  category: string;
  location: string;
}) {
  const res = await api.post("/tickets/", data);
  return res.data;
}

// Assign a ticket (admin/staff)
export async function assignTicket(ticketId: number, assigneeId: number) {
  const res = await api.post(`/tickets/${ticketId}/assign/`, {
    assignee_id: assigneeId,
  });
  return res.data;
}

// Resolve ticket (staff)
export async function resolveTicket(ticketId: number, resolution: string) {
  const res = await api.post(`/tickets/${ticketId}/resolve/`, { resolution });
  return res.data;
}

// Close ticket (admin/staff)
export async function closeTicket(ticketId: number) {
  const res = await api.post(`/tickets/${ticketId}/close/`);
  return res.data;
}

// Reopen ticket (admin)
export async function reopenTicket(ticketId: number) {
  const res = await api.post(`/tickets/${ticketId}/reopen/`);
  return res.data;
}
