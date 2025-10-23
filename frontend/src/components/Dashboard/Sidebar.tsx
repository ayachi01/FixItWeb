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
    { label: "Dashboard Overview", path: "/dashboard/main", icon: <LayoutDashboard size={18} />, section: "General" },
    /*{ label: "Submit Ticket", path: "/dashboard/submit-ticket", icon: <Home size={18} />, section: "General" },*/
    { label: "My Tickets", path: "/dashboard/my-tickets", icon: <FileText size={18} />, section: "General" },
    {
      label: "My Assigned Tickets",
      path: "/dashboard/my-assigned-tickets",
      icon: <ClipboardCheck size={18} />,
      section: "Tickets",
      roles: ["Support", "Janitorial Staff", "Utility Worker", "Security Guard"],
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
  ];

  const sections = Array.from(new Set(menuItems.map((i) => i.section)));

  return (
    <div className="flex flex-col h-screen w-64 bg-[#FFFFFF] border-r border-gray-200">
      {/* Logo Section */}
      <div className="flex items-center justify-center py-6 bg-white">
        <img
          src="/src/assets/fixit_logo.png"
          alt="FixIt Logo"
          className="h-20 w-auto transition-transform duration-300 hover:scale-105"
        />
      </div>

      {/* Menu Section (No Scroll) */}
      <div className="flex-1 px-4 py-4">
        {sections.map((section) => {
          const visibleItems = menuItems.filter((item) => {
            if (item.section !== section) return false;
            if (user.isSuperuser) return true;
            return !item.roles || item.roles.includes(user.role?.name || "");
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={section} className="w-full mb-5">
              <p className="text-xs uppercase tracking-widest text-[#2E5E3A] font-semibold px-2 mb-2">
                {section}
              </p>
              <ul className="space-y-1">
                {visibleItems.map((item) => (
                  <li key={item.label}>
                    <NavLink
                      to={item.path!}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-200 ${isActive
                          ? "bg-[#2E5E3A] text-white font-semibold shadow-sm"
                          : "text-[#2E5E3A] hover:bg-[#E8EFEA]"
                        }`
                      }
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Logout Button */}
      <div className="p-4 bg-white">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-[#2E5E3A] text-white font-medium hover:bg-[#254D2F] transition-all duration-200 shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
