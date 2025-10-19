// 📂 src/components/Sidebar.tsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  FileText,
  Users,
  Settings,
  ClipboardCheck,
  Home,
  Ticket,
  ShieldCheck,
  Key,
  LayoutDashboard,
  LogOut,
  Bell,
  FileBarChart2,
} from "lucide-react";

interface MenuItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  roles?: string[];
  section?: string;
  onClick?: () => void;
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const menuItems: MenuItem[] = [
    // 🟨 General
    {
      label: "Dashboard Overview",
      path: "/dashboard/main",
      icon: <LayoutDashboard size={18} />,
      section: "General",
    },
    {
      label: "Submit Ticket",
      path: "/dashboard/submit-ticket",
      icon: <Home size={18} />,
      section: "General",
    },
    {
      label: "My Tickets",
      path: "/dashboard/my-tickets",
      icon: <FileText size={18} />,
      section: "General",
    },

    // 🟨 Tickets
    {
      label: "My Assigned Tickets",
      path: "/dashboard/my-assigned-tickets",
      icon: <ClipboardCheck size={18} />,
      section: "Tickets",
      roles: [
        "Support",
        "Janitorial Staff",
        "Utility Worker",
        "Security Guard",
      ],
    },
    {
      label: "My Unassigned Tickets",
      path: "/dashboard/assigned-tickets",
      icon: <ClipboardCheck size={18} />,
      section: "Tickets",
      roles: ["University Admin", "Maintenance Officer"],
    },
    {
      label: "All Tickets",
      path: "/dashboard/tickets",
      icon: <Ticket size={18} />,
      section: "Tickets",
      roles: ["University Admin", "Maintenance Officer"],
    },

    // 🟨 Analytics
    {
      label: "Reports & Analytics",
      path: "/dashboard/reports",
      icon: <FileBarChart2 size={18} />,
      section: "Analytics",
      roles: ["University Admin"],
    },
    {
      label: "Notifications",
      path: "/dashboard/notifications",
      icon: <Bell size={18} />,
      section: "Analytics",
    },

    // 🟨 Management
    {
      label: "Manage Users",
      path: "/dashboard/users",
      icon: <Users size={18} />,
      section: "Management",
      roles: ["HR", "Registrar", "University Admin"],
    },
    {
      label: "Roles Management",
      path: "/dashboard/roles",
      icon: <Key size={18} />,
      section: "Management",
      roles: ["University Admin"],
    },
    {
      label: "Invite User",
      path: "/dashboard/invite",
      icon: <Key size={18} />,
      section: "Management",
      roles: ["HR", "Registrar", "University Admin"],
    },
    {
      label: "All Invites",
      path: "/dashboard/invites",
      icon: <FileText size={18} />,
      section: "Management",
      roles: ["HR", "Registrar", "University Admin"],
    },
    {
      label: "Audit Logs",
      path: "/dashboard/audit-logs",
      icon: <ShieldCheck size={18} />,
      section: "Management",
      roles: ["University Admin"],
    },
    {
      label: "System Settings",
      path: "/dashboard/settings",
      icon: <Settings size={18} />,
      section: "Management",
      roles: ["University Admin"],
    },

    // 🟨 Account
    {
      label: "Logout",
      icon: <LogOut size={18} />,
      section: "Account",
      onClick: handleLogout,
    },
  ];

  const sections = Array.from(new Set(menuItems.map((i) => i.section)));

  return (
    <div className="flex flex-col h-screen w-60 bg-[#FFF9ED] shadow-[2px_0_6px_rgba(0,0,0,0.05)]">
      {/* Logo */}
      <div className="p-5 flex items-center justify-center bg-gradient-to-r from-amber-50 to-[#FFF9ED] shadow-sm">
        <h1 className="text-xl font-bold text-amber-900 tracking-wide">
          📊 FixIt Reports
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-6">
        {sections.map((section) => {
          const visibleItems = menuItems.filter((item) => {
            if (item.section !== section) return false;
            if (user.isSuperuser) return true;
            return !item.roles || item.roles.includes(user.role?.name || "");
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={section}>
              <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold px-2 mb-2">
                {section}
              </p>
              <ul className="space-y-1">
                {visibleItems.map((item) => (
                  <li key={item.label}>
                    {item.onClick ? (
                      <div
                        onClick={item.onClick}
                        className="flex items-center gap-3 px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-all"
                      >
                        <span className="text-amber-700">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    ) : (
                      <NavLink
                        to={item.path!}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-200
                           ${
                             isActive
                               ? "bg-amber-100 text-amber-900 font-semibold text-[15px] shadow-sm border-l-4 border-amber-500"
                               : "text-gray-700 text-[14px] hover:bg-amber-50 hover:text-amber-800"
                           }`
                        }
                      >
                        <span className="text-amber-700">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
