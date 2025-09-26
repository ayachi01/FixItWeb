import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Define menu items by feature
  const menuItems = [
    { feature: "canReport", label: "Report Issue", path: "/dashboard" },
    { feature: "myReports", label: "My Reports", path: "/tickets" },
    { feature: "overview", label: "Overview", path: "/dashboard" },
    { feature: "assignTickets", label: "Assign Tickets", path: "/tickets" },
    { feature: "manageUsers", label: "Manage Users", path: "/users" },
    { feature: "systemSettings", label: "System Settings", path: "/settings" },
  ];

  return (
    <div className="h-screen w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 text-xl font-bold border-b border-gray-700">
        🎓 FixIt
      </div>

      <div className="flex-1 p-2 space-y-2">
        {menuItems
          .filter((item) => user?.features?.includes(item.feature))
          .map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="block px-4 py-2 rounded hover:bg-gray-700"
            >
              {item.label}
            </Link>
          ))}
      </div>

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
