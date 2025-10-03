import { useAuthStore } from "../../store/authStore";

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      {/* Left: Dashboard title */}
      <div>
        <h1 className="text-lg font-semibold text-gray-700">
          {user?.roleName
            ? `${capitalize(user.roleName)} Dashboard`
            : "Dashboard"}
        </h1>
      </div>

      {/* Right: User info + logout */}
      <div className="flex items-center gap-4">
        <span className="text-gray-600">{user?.email || "Guest"}</span>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

// Capitalize helper
function capitalize(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}
