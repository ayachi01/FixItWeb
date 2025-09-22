// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { getProfileFromStorage, fetchProfileAndSave } from "../utils/auth";
import { useAuth } from "../context/AuthContext";

import type { UserProfile } from "../utils/auth";

// ✅ Check specific roles first (order matters!)
function roleCategory(role: string | undefined) {
  if (!role) return "reporter";
  const r = role.toLowerCase();

  if (r.includes("university admin")) return "superadmin"; // check first
  if (["registrar", "hr"].some((x) => r.includes(x))) return "admin";
  if (r.includes("maintenance officer")) return "officer";
  if (
    ["janitorial staff", "utility worker", "it support", "security guard"].some(
      (x) => r.includes(x)
    )
  )
    return "staff";
  if (
    ["student", "faculty", "admin staff", "visitor"].some((x) => r.includes(x))
  )
    return "reporter";

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

function ProfileModal({
  profile,
  onClose,
}: {
  profile: UserProfile;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Profile</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>Email:</strong> {profile.email}
          </li>
          <li>
            <strong>Role:</strong> {profile.role}
          </li>
          <li>
            <strong>Email Verified:</strong>{" "}
            {profile.is_email_verified ? "✅ Yes" : "❌ No"}
          </li>
          <li>
            <strong>Domain:</strong> {profile.email_domain}
          </li>
          <li>
            <strong>Permissions:</strong>
            <ul className="list-disc list-inside ml-3">
              {profile.can_report && <li>Report Issues</li>}
              {profile.can_fix && <li>Fix Issues</li>}
              {profile.can_assign && <li>Assign Tasks</li>}
            </ul>
          </li>
        </ul>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    getProfileFromStorage()
  );
  const [loadingProfile, setLoadingProfile] = useState(!profile);
  const [showProfile, setShowProfile] = useState(false);
  const { logout, sessionExpired, setSessionExpired } = useAuth();

  useEffect(() => {
    let mounted = true;
    if (!profile) {
      setLoadingProfile(true);
      fetchProfileAndSave()
        .then((p) => {
          if (mounted) setProfile(p);
        })
        .catch((e) => {
          console.error("Failed to fetch profile:", e);
          if (mounted) setSessionExpired(true);
        })
        .finally(() => {
          if (mounted) setLoadingProfile(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [profile, setSessionExpired]);

  const category = useMemo(() => roleCategory(profile?.role), [profile]);
  const features = FEATURES[category] || FEATURES.reporter;

  if (loadingProfile) {
    return <div className="p-6">Loading profile...</div>;
  }

  // ✅ Let PrivateRoute show the Session Expired UI
  if (sessionExpired) {
    return null;
  }

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
            <button
              onClick={() => setShowProfile(true)}
              className="px-3 py-1 border rounded mr-2"
            >
              Profile
            </button>
            <button
              onClick={logout}
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

      {showProfile && profile && (
        <ProfileModal profile={profile} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
