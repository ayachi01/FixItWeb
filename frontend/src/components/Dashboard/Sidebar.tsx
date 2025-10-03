import { useNavigate, useLocation } from "react-router-dom";
import type { Permissions } from "../../store/authStore"; // ✅ type-only import
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
  File,
} from "lucide-react";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permissionCheck?: (permissions: Permissions) => boolean;
}

// 🔹 Grouped for clarity
const generalMenu = [
  {
    label: "Submit Ticket",
    path: "/submit-ticket",
    icon: <Home size={18} />,
    permissionCheck: (p: Permissions) => p.can_report,
  },
  {
    label: "My Tickets",
    path: "/my-tickets",
    icon: <FileText size={18} />,
    permissionCheck: (p: Permissions) => p.can_report,
  },
  {
    label: "Assigned Tickets",
    path: "/assigned-tickets",
    icon: <ClipboardCheck size={18} />,
    permissionCheck: (p: Permissions) => p.can_fix || p.can_assign,
  },
];

const adminMenu = [
  {
    label: "Admin Dashboard",
    path: "/admin/dashboard",
    icon: <LayoutDashboard size={18} />,
    permissionCheck: (p: Permissions) => p.is_admin_level || p.can_manage_users,
  },
  {
    label: "All Tickets",
    path: "/admin/tickets",
    icon: <Ticket size={18} />,
    permissionCheck: (p: Permissions) => p.is_admin_level || p.can_manage_users,
  },
  {
    label: "Reports",
    path: "/admin/reports",
    icon: <File size={18} />,
    permissionCheck: (p: Permissions) => p.is_admin_level || p.can_manage_users,
  },
  {
    label: "Notifications",
    path: "/admin/notifications",
    icon: <Bell size={18} />,
    permissionCheck: (p: Permissions) => p.is_admin_level || p.can_manage_users,
  },
  {
    label: "Bulk Actions",
    path: "/admin/bulk-actions",
    icon: <ClipboardCheck size={18} />,
    permissionCheck: (p: Permissions) => p.is_admin_level || p.can_manage_users,
  },
  {
    label: "Manage Users",
    path: "/admin/users",
    icon: <Users size={18} />,
    permissionCheck: (p: Permissions) => p.can_manage_users,
  },
  {
    label: "Roles Management",
    path: "/admin/roles",
    icon: <Key size={18} />,
    permissionCheck: (p: Permissions) => p.can_manage_users,
  },
  {
    label: "Audit Logs",
    path: "/admin/audit-logs",
    icon: <ShieldCheck size={18} />,
    permissionCheck: (p: Permissions) => p.is_admin_level,
  },
  {
    label: "System Settings",
    path: "/admin/settings",
    icon: <Settings size={18} />,
    permissionCheck: (p: Permissions) => p.is_admin_level,
  },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;
  const { permissions } = user;

  const allMenu: MenuItem[] = [...generalMenu, ...adminMenu];

  const renderMenu = () =>
    allMenu
      .filter((item) =>
        item.permissionCheck ? item.permissionCheck(permissions) : true
      )
      .map((item) => {
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
      <div className="flex-1 overflow-y-auto p-2 space-y-2">{renderMenu()}</div>

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
