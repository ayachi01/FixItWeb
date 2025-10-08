// 📂 src/config/menuConfig.tsx
import type { ReactNode } from "react";
import {
  Home,
  Ticket,
  Users,
  Settings,
  ClipboardList,
  FileText,
  Bell,
  Key,
  LayoutDashboard,
} from "lucide-react";

export interface MenuItem {
  title: string;
  icon?: ReactNode;
  path?: string;
  children?: MenuItem[];
  hidden?: boolean; // for routes that should exist but not appear in sidebar
}

export const menuConfig: MenuItem[] = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    path: "/dashboard/main",
  },
  {
    title: "Tickets",
    icon: <Ticket size={18} />,
    children: [
      { title: "Submit Ticket", path: "/dashboard/submit-ticket" },
      { title: "My Tickets", path: "/dashboard/my-tickets" },
      { title: "My Unassigned Tickets", path: "/dashboard/assigned-tickets" },
      { title: "My Assigned Tickets", path: "/dashboard/my-assigned-tickets" },
      { title: "All Tickets", path: "/dashboard/tickets" },
      { title: "Ticket Detail", path: "/dashboard/tickets/:id", hidden: true },
      {
        title: "Edit Ticket",
        path: "/dashboard/tickets/:id/edit",
        hidden: true,
      },
    ],
  },
  {
    title: "Users",
    icon: <Users size={18} />,
    children: [
      { title: "All Users", path: "/dashboard/users" },
      { title: "User Detail", path: "/dashboard/users/:id", hidden: true },
      { title: "Roles Management", path: "/dashboard/roles" },
    ],
  },
  {
    title: "Invites",
    icon: <ClipboardList size={18} />,
    children: [
      { title: "Invite User", path: "/dashboard/invite" },
      { title: "Invites List", path: "/dashboard/invites" },
    ],
  },
  {
    title: "Audit Logs",
    icon: <Key size={18} />,
    path: "/dashboard/audit-logs",
  },
  {
    title: "System Settings",
    icon: <Settings size={18} />,
    path: "/dashboard/settings",
  },
  {
    title: "Reports",
    icon: <FileText size={18} />,
    path: "/dashboard/reports",
  },
  {
    title: "Notifications",
    icon: <Bell size={18} />,
    path: "/dashboard/notifications",
  },
];
