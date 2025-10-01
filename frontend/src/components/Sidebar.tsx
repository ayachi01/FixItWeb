// src/components/Sidebar.tsx
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const roleName = user?.role?.name?.toLowerCase() || "";

  // 🔹 Common menu (all users)
  const commonMenu: MenuItem[] = [
    {
      label: "Report Ticket",
      path: "/report-ticket",
      icon: <Home size={18} />,
    },
    { label: "My Reports", path: "/tickets", icon: <FileText size={18} /> },
  ];

  // 🔹 Staff-only
  const staffMenu: MenuItem[] = roleName.includes("staff")
    ? [
        {
          label: "Overview",
          path: "/assigned-tickets/overview",
          icon: <ClipboardCheck size={18} />,
        },
        {
          label: "Assign Tickets",
          path: "/assigned-tickets/assign",
          icon: <ClipboardCheck size={18} />,
        },
      ]
    : [];

  // 🔹 Admin-only
  const adminMenu: MenuItem[] =
    roleName === "admin" ||
    roleName === "super admin" ||
    roleName === "university admin"
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
            label: "Manage Users",
            path: "/admin/users",
            icon: <Users size={18} />,
          },
          {
            label: "Roles",
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

  // 🔹 Logout handler
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="h-screen w-64 bg-gray-800 text-white flex flex-col">
      {/* Logo / Header */}
      <div className="p-4 text-xl font-bold border-b border-gray-700">
        🎓 FixIt
      </div>

      {/* Menus */}
      <div className="flex-1 p-2 space-y-2">
        {[...commonMenu, ...staffMenu].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center w-full px-4 py-2 rounded hover:bg-gray-700 text-left"
          >
            {item.icon}
            <span className="ml-2">{item.label}</span>
          </button>
        ))}

        {/* Admin section */}
        {adminMenu.length > 0 && (
          <>
            <hr className="my-3 border-gray-600" />
            <p className="px-4 text-sm font-semibold text-gray-400">
              Admin Panel
            </p>
            {adminMenu.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex items-center w-full px-4 py-2 rounded hover:bg-gray-700 text-left"
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded"
        >
          <LogOut size={16} className="mr-2" /> Logout
        </button>
      </div>
    </div>
  );
}
