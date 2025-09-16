export interface User {
  id: number;
  email: string;
}

export interface UserProfile {
  id: number;
  user: User;
  role:
    | "Student"
    | "Faculty"
    | "Admin Staff"
    | "Janitorial Staff"
    | "IT Support"
    | "Utility Worker"
    | "Security Guard"
    | "Maintenance Officer"
    | "University Admin";
  is_email_verified: boolean;
  email_domain: string;
}

export interface Location {
  id: number;
  building_name: string;
  floor_number: string;
  room_identifier: string;
}

export interface Ticket {
  id: number;
  description: string;
  status: "Open" | "Assigned" | "In Progress" | "Resolved";
  category: "Cleaning" | "Maintenance" | "IT" | "Security";
  urgency: "Standard" | "Urgent";
  location: Location;
  reported_by: User;
  assigned_to: User | null;
  created_at: string;
  updated_at: string;
  escalated_to: string;
  escalated_at: string | null;
}

// src/types/GuestReportForm.ts
export interface GuestReportForm {
  guest_name: string;
  guest_email: string;
  guest_contact: string;
  description: string;
  category:
    | "Cleaning"
    | "Plumbing"
    | "Electrical"
    | "Structural"
    | "HVAC"
    | "Technology"
    | "Equipment"
    | "Disturbance"
    | "Security"
    | "Parking";
  urgency: "Standard" | "Urgent";
  location: number; // FK → Django expects an ID
  image: File | null; // optional
}

export interface Notification {
  id: number;
  user: User | null;
  guest_email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
