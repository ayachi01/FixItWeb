// src/components/Sidebar.tsx
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
  FileText,
  Users,
  Settings,
  Cpu,
  ClipboardCheck,
  Home,
} from "lucide-react";

interface MenuItem {
  feature: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // 🔹 Logout handler
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // 🔹 Define menu items by feature with icons
  const menuItems: MenuItem[] = [
    {
      feature: "canReport",
      label: "Report Ticket",
      path: "/report-ticket",
      icon: <Home size={18} />,
    },
    {
      feature: "myReports",
      label: "My Reports",
      path: "/tickets",
      icon: <FileText size={18} />,
    },
    {
      feature: "overview",
      label: "Overview",
      path: "/assigned-tickets/overview",
      icon: <ClipboardCheck size={18} />,
    },
    {
      feature: "assignTickets",
      label: "Assign Tickets",
      path: "/assigned-tickets/assign",
      icon: <ClipboardCheck size={18} />,
    },
    {
      feature: "manageUsers",
      label: "Manage Users",
      path: "/users",
      icon: <Users size={18} />,
    },
    {
      feature: "systemSettings",
      label: "System Settings",
      path: "/settings",
      icon: <Settings size={18} />,
    },
    {
      feature: "aiReports",
      label: "AI Reports",
      path: "/ai-reports",
      icon: <Cpu size={18} />,
    },
  ];

  // 🔹 Hide sidebar if user is not logged in
  if (!user) return null;

  return (
    <div className="h-screen w-64 bg-gray-800 text-white flex flex-col">
      {/* Logo / header */}
      <div className="p-4 text-xl font-bold border-b border-gray-700">
        🎓 FixIt
      </div>

      {/* Menu items */}
      <div className="flex-1 p-2 space-y-2">
        {menuItems
          .filter((item) => user.features?.includes(item.feature))
          .map((item) => (
            <button
              key={item.feature} // ✅ Use feature as unique key
              onClick={() => navigate(item.path)}
              className="flex items-center w-full px-4 py-2 rounded hover:bg-gray-700 text-left"
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </button>
          ))}
      </div>

      {/* Logout button */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
