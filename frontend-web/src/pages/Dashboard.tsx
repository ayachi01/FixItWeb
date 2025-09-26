// src/pages/Dashboard.tsx
import { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchProfileAndSave, type UserProfile } from "../utils/auth";
import {
  User,
  LogOut,
  Bell,
  FileText,
  ClipboardList,
  Camera,
  Settings,
  Users,
  BarChart2,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  CheckCircle,
} from "lucide-react";
import type { ReactNode, FC } from "react";

// ------------------- Feature Registry -------------------
const FEATURE_REGISTRY: Record<
  string,
  {
    component: React.LazyExoticComponent<FC<any>>;
    label: string;
    icon: ReactNode;
  }
> = {
  report: {
    component: lazy(() => import("./features/ReportPage")),
    label: "Report Issue",
    icon: <FileText size={18} />,
  },
  myReports: {
    component: lazy(() => import("./features/MyReportsPage")),
    label: "My Reports",
    icon: <ClipboardList size={18} />,
  },
  notifications: {
    component: lazy(() => import("./features/NotificationsPage")),
    label: "Notifications",
    icon: <Bell size={18} />,
  },
  assigned: {
    component: lazy(() => import("./features/AssignedPage")),
    label: "Assigned Tickets",
    icon: <ClipboardCheck size={18} />,
  },
  upload: {
    component: lazy(() => import("./features/UploadPage")),
    label: "Upload Proof",
    icon: <Camera size={18} />,
  },
  status: {
    component: lazy(() => import("./features/StatusPage")),
    label: "Update Status",
    icon: <Clock size={18} />,
  },
  history: {
    component: lazy(() => import("./features/HistoryPage")),
    label: "Work History",
    icon: <Clock size={18} />,
  },
  overview: {
    component: lazy(() => import("./features/OverviewPage")),
    label: "Overview",
    icon: <BarChart2 size={18} />,
  },
  assign: {
    component: lazy(() => import("./features/AssignPage")),
    label: "Assign Tickets",
    icon: <ClipboardList size={18} />,
  },
  review: {
    component: lazy(() => import("./features/ReviewPage")),
    label: "Review Proof",
    icon: <Camera size={18} />,
  },
  escalate: {
    component: lazy(() => import("./features/EscalatePage")),
    label: "Escalations",
    icon: <AlertTriangle size={18} />,
  },
  users: {
    component: lazy(() => import("./features/UsersPage")),
    label: "User Management",
    icon: <Users size={18} />,
  },
  reports: {
    component: lazy(() => import("./features/ReportsPage")),
    label: "Reports",
    icon: <BarChart2 size={18} />,
  },
  settings: {
    component: lazy(() => import("./features/SettingsPage")),
    label: "System Settings",
    icon: <Settings size={18} />,
  },
  ai: {
    component: lazy(() => import("./features/AIReportsPage")),
    label: "AI Reports",
    icon: <BarChart2 size={18} />,
  },
  close: {
    component: lazy(() => import("./features/ClosePage")),
    label: "Close Tickets",
    icon: <CheckCircle size={18} />,
  },
  profile: {
    component: lazy(() => import("./features/ProfilePage")),
    label: "Profile",
    icon: <User size={18} />,
  },
};

// ------------------- Sidebar -------------------
function Sidebar({
  features,
  active,
  setActive,
  onLogout,
}: {
  features: string[];
  active: string;
  setActive: (v: string) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="bg-white shadow-lg h-screen w-64 p-5 flex flex-col border-r">
      <h2 className="text-2xl font-bold mb-8 text-blue-600">FixIt Dashboard</h2>
      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        {features.map((key) => {
          const feature = FEATURE_REGISTRY[key];
          if (!feature) return null;
          return (
            <SidebarItem
              key={key}
              active={active === key}
              onClick={() => setActive(key)}
              icon={feature.icon}
              label={feature.label}
            />
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t pt-4">
        <button
          onClick={() => setActive("profile")}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-blue-50 transition text-gray-700"
        >
          <User size={18} /> Profile
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 transition"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer transition-all ${
        active
          ? "bg-blue-100 text-blue-600 font-semibold shadow-sm"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

// ------------------- Dashboard -------------------
export default function Dashboard() {
  const [active, setActive] = useState("overview");
  const { profile, logout, sessionExpired, login } = useAuth();

  // ✅ Auto-fetch profile on mount if missing
  useEffect(() => {
    async function loadProfile() {
      try {
        if (!profile) {
          const freshProfile: UserProfile | null = await fetchProfileAndSave();
          if (freshProfile) {
            await login(
              localStorage.getItem("access_token") || "",
              freshProfile
            );
          } else {
            // 🚪 If no profile returned, logout
            await logout();
          }
        }
      } catch (err) {
        console.error("❌ Failed to load profile:", err);
        await logout(); // 🔑 ensure user is kicked out if invalid session
      }
    }
    loadProfile();
  }, [profile, login, logout]);

  if (sessionExpired) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-6 rounded shadow-md text-center">
          <h2 className="text-xl font-semibold mb-2">⚠️ Session Expired</h2>
          <p className="text-gray-600 mb-4">
            Your session has expired. Please log in again to continue.
          </p>
          <a
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Re-Login
          </a>
        </div>
      </div>
    );
  }

  if (!profile) return <div className="p-6">Loading profile...</div>;

  const availableFeatures = profile.features.filter((f) => FEATURE_REGISTRY[f]);
  const ActiveComponent =
    FEATURE_REGISTRY[active]?.component ||
    FEATURE_REGISTRY["overview"].component;

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar
        features={availableFeatures}
        active={active}
        setActive={setActive}
        onLogout={logout}
      />

      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome back 👋</h1>
          <p className="text-sm text-gray-600 mt-1">
            {profile.email} • <span className="capitalize">{profile.role}</span>
          </p>
        </header>

        <section>
          <Suspense fallback={<div>Loading section...</div>}>
            <ActiveComponent />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
