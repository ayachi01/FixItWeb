import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProfileFromStorage,
  fetchProfileAndSave,
  logoutAndClear,
} from "../utils/auth";

import type { UserProfile } from "../utils/auth";

function roleCategory(role: string | undefined) {
  if (!role) return "reporter";
  const r = role.toLowerCase();

  if (
    ["student", "faculty", "admin staff", "visitor"].some((x) => r.includes(x))
  )
    return "reporter";
  if (
    ["janitorial staff", "utility worker", "it support", "security guard"].some(
      (x) => r.includes(x)
    )
  )
    return "staff";
  if (r.includes("maintenance officer")) return "officer";
  if (["registrar", "hr"].some((x) => r.includes(x))) return "admin";
  if (r.includes("university admin")) return "superadmin";

  return "reporter";
}

const FEATURES: Record<
  string,
  {
    canReport?: boolean;
    canViewReports?: boolean;
    canUploadProof?: boolean;
    canAssign?: boolean;
    overview?: boolean;
    manageUsers?: boolean;
    systemSettings?: boolean;
    aiReports?: boolean;
  }
> = {
  reporter: { canReport: true, canViewReports: true },
  staff: { canViewReports: true, canUploadProof: true },
  officer: {
    canReport: true,
    canViewReports: true,
    canUploadProof: true,
    canAssign: true,
    overview: true,
  },
  admin: {
    canViewReports: true,
    canAssign: true,
    overview: true,
    manageUsers: true,
  },
  superadmin: {
    canViewReports: true,
    canAssign: true,
    overview: true,
    manageUsers: true,
    systemSettings: true,
    aiReports: true,
  },
};

function SmallCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-4 rounded-md shadow-sm border">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    getProfileFromStorage()
  );
  const [loadingProfile, setLoadingProfile] = useState(!profile);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    if (!profile) {
      fetchProfileAndSave()
        .then((p) => {
          if (mounted) setProfile(p);
        })
        .catch((e) => console.error(e))
        .finally(() => {
          if (mounted) setLoadingProfile(false);
        });
    } else {
      setLoadingProfile(false);
    }
    return () => {
      mounted = false;
    };
  }, [profile]);

  const category = useMemo(() => roleCategory(profile?.role), [profile]);
  const features = FEATURES[category] || FEATURES.reporter;

  const handleLogout = () => {
    logoutAndClear(); // clear tokens + profile
    navigate("/login");
  };

  if (loadingProfile) return <div className="p-6">Loading profile...</div>;

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-600">
              Welcome, {profile?.email} • Role: {profile?.role}
            </p>
          </div>
          <div>
            <button className="px-3 py-1 border rounded mr-2">Profile</button>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.canReport && (
            <SmallCard title="➕ Report Issue">Form / quick link</SmallCard>
          )}
          {features.canViewReports && (
            <SmallCard title="📌 My Reports">List of tickets</SmallCard>
          )}
          {features.canUploadProof && (
            <SmallCard title="📷 Upload Proof">Upload photo/video</SmallCard>
          )}
          {features.canAssign && (
            <SmallCard title="📝 Assign Tickets">Assign tickets</SmallCard>
          )}
          {features.overview && (
            <SmallCard title="📊 Overview">Charts here</SmallCard>
          )}
          {features.manageUsers && (
            <SmallCard title="👥 User Management">Manage accounts</SmallCard>
          )}
          {features.systemSettings && (
            <SmallCard title="⚙️ System Settings">Settings UI</SmallCard>
          )}
          {features.aiReports && (
            <SmallCard title="🤖 AI Reports">Weekly reports</SmallCard>
          )}
        </section>
      </div>
    </div>
  );
}
