// 📂 src/api/ticket.ts
import { api } from "./client"; // your Axios instance

// -------------------- Types --------------------
export interface User {
  id: number;
  full_name: string; // first_name + last_name combined or email
  email: string;
}

// Image type from API
export interface TicketImage {
  id: number;
  image_url: string;
}

// Ticket types
export type TicketStatus =
  | "CREATED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "NEEDS_ASSISTANCE"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type TicketCategory =
  | "CLEANING"
  | "PLUMBING"
  | "ELECTRICAL"
  | "STRUCTURAL"
  | "HVAC"
  | "TECHNOLOGY"
  | "EQUIPMENT"
  | "DISTURBANCE"
  | "SECURITY"
  | "PARKING";

export type TicketUrgency = "STANDARD" | "URGENT";
export type TicketEscalation = "NONE" | "SECONDARY" | "ADMIN";

// Ticket interface matching your API response
export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  urgency: TicketUrgency;
  escalation_level: TicketEscalation;
  reporter: User | null;
  location: number | null; // API returns location ID
  location_name: string; // API returns this
  assignees: User[];
  can_fix: boolean; // frontend flag from user permissions
  images?: TicketImage[]; // API returns list of images
  created_at: string;
  updated_at: string;
}

// -------------------- API Functions --------------------

// Fetch all tickets
export const getAllTickets = async (): Promise<Ticket[]> => {
  const { data } = await api.get<Ticket[]>("/tickets/");
  return data;
};

// Fetch single ticket by ID
export const getTicketById = async (id: number): Promise<Ticket> => {
  const { data } = await api.get<Ticket>(`/tickets/${id}/`);
  return data;
};
