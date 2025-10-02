import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
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
  File,
} from "lucide-react";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;
  const { permissions } = user;

  // 🔹 Build menu properly
  const commonMenu: MenuItem[] = permissions.can_report
    ? [
        {
          label: "Submit Ticket",
          path: "/submit-ticket",
          icon: <Home size={18} />,
        },
        {
          label: "My Tickets",
          path: "/my-tickets",
          icon: <FileText size={18} />,
        },
      ]
    : [];

  const staffMenu: MenuItem[] =
    permissions.can_fix || permissions.can_assign
      ? [
          {
            label: "Assigned Tickets",
            path: "/assigned-tickets",
            icon: <ClipboardCheck size={18} />,
          },
        ]
      : [];

  const adminMenu: MenuItem[] =
    permissions.is_admin_level || permissions.can_manage_users
      ? [
          {
            label: "Admin Dashboard",
            path: "/admin/dashboard",
            icon: <LayoutDashboard size={18} />,
          },
          {
            label: "All Tickets",
            path: "/admin/tickets",
            icon: <Ticket size={18} />,
          },
          {
            label: "Reports",
            path: "/admin/reports",
            icon: <File size={18} />,
          },
          {
            label: "Notifications",
            path: "/admin/notifications",
            icon: <Bell size={18} />,
          },
          {
            label: "Bulk Actions",
            path: "/admin/bulk-actions",
            icon: <ClipboardCheck size={18} />,
          },
          {
            label: "Manage Users",
            path: "/admin/users",
            icon: <Users size={18} />,
          },
          {
            label: "Roles Management",
            path: "/admin/roles",
            icon: <Key size={18} />,
          },
          {
            label: "Audit Logs",
            path: "/admin/audit-logs",
            icon: <ShieldCheck size={18} />,
          },
          {
            label: "System Settings",
            path: "/admin/settings",
            icon: <Settings size={18} />,
          },
        ]
      : [];

  const renderMenu = (menu: MenuItem[]) =>
    menu.map((item) => {
      const isActive = location.pathname.startsWith(item.path);
      return (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={`flex items-center w-full px-4 py-2 rounded hover:bg-gray-700 text-left transition-colors duration-150 ${
            isActive ? "bg-gray-700 font-semibold" : ""
          }`}
        >
          {item.icon}
          <span className="ml-2">{item.label}</span>
        </button>
      );
    });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-screen w-64 bg-gray-800 text-white shadow-lg">
      {/* Logo */}
      <div className="p-4 text-2xl font-bold border-b border-gray-700 flex items-center justify-center">
        🎓 FixIt
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {renderMenu(commonMenu)}
        {renderMenu(staffMenu)}
        {adminMenu.length > 0 && (
          <>
            <hr className="my-3 border-gray-600" />
            <p className="px-4 text-sm font-semibold text-gray-400">
              Admin Panel
            </p>
            {renderMenu(adminMenu)}
          </>
        )}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded transition-colors duration-150"
        >
          <LogOut size={16} className="mr-2" /> Logout
        </button>
      </div>
    </div>
  );
}
