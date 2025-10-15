import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  FileText,
  Users,
  Settings,
  ClipboardCheck,
  Home,
  ShieldCheck,
  Key,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import fixitLogo from "../../assets/fixit_logo.png";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { label: "Submit Ticket", path: "/dashboard/submit-ticket", icon: <Home size={18} /> },
  { label: "All Tickets", path: "/dashboard/assigned-tickets", icon: <ClipboardCheck size={18} />, roles: ["University Admin", "Maintenance Officer"] },
  { label: "My Assigned Tickets", path: "/dashboard/my-assigned-tickets", icon: <ClipboardCheck size={18} />, roles: ["Support", "Janitorial Staff", "Utility Worker", "Security Guard"] },
  { label: "Dashboard", path: "/dashboard/main", icon: <LayoutDashboard size={18} /> },
  { label: "Manage Users", path: "/dashboard/users", icon: <Users size={18} />, roles: ["HR", "Registrar", "University Admin"] },
  { label: "Invite User", path: "/dashboard/invite", icon: <Key size={18} />, roles: ["HR", "Registrar", "University Admin"] },
  { label: "All Invites", path: "/dashboard/invites", icon: <FileText size={18} />, roles: ["HR", "Registrar", "University Admin"] },
  { label: "Audit Logs", path: "/dashboard/audit-logs", icon: <ShieldCheck size={18} />, roles: ["University Admin"] },
  { label: "System Settings", path: "/dashboard/settings", icon: <Settings size={18} />, roles: ["University Admin"] },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [width, setWidth] = useState(256);
  const isResizing = useRef(false);

  if (!user) return null;

  const startResize = () => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = Math.min(Math.max(e.clientX, 180), 400);
    setWidth(newWidth);
  };

  const stopResize = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  };

  const renderMenu = () =>
    menuItems
      .filter((item) => {
        if (user.isSuperuser) return true;
        return !item.roles || item.roles.includes(user.role?.name || "");
      })
      .map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex items-center w-full px-4 py-2 rounded-lg text-left transition-all duration-150 ${isActive
              ? "bg-[#FFEFCB] font-semibold text-gray-900"
              : "hover:bg-[#FFF3D9] text-gray-700"
              }`}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </button>
        );
      });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div
      className="fixed top-0 left-0 flex flex-col bg-[#FFF7E6] border-r border-gray-300 select-none shadow-md"
      style={{
        width: `${width}px`,
        height: "100vh",
        transition: "width 0.1s ease",
        zIndex: 50,
      }}
    >
      {/* 🔹 Logo Section with Overlapping Image */}
      <div
        className="relative flex items-center justify-center h-[150px] border-b border-gray-300 cursor-pointer"
        onClick={() => navigate("/dashboard/main")}
      >
        <img
          src={fixitLogo}
          alt="FixIT PHINMA Logo"
          className="absolute -top-6 w-[190px] h-[200px] object-contain"
        />
      </div>

      {/* 🔸 Menu Section */}
      <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        {renderMenu()}
      </div>

      {/* 🔻 Logout Button */}
      <div className="p-4 border-t border-gray-300">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md transition-colors duration-150"
        >
          <LogOut size={16} className="mr-2" /> Logout
        </button>
      </div>

      {/* ⬅️ Resize Handle */}
      <div
        onMouseDown={startResize}
        className="absolute top-0 right-0 h-full w-1 cursor-ew-resize bg-transparent hover:bg-gray-300 transition-colors"
      />
    </div>
  );
}
