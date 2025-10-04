// 📂 src/pages/Dashboard/SettingsPage.tsx
import React from "react";

export default function SettingsPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">⚙️ System Settings</h1>
      <p className="mb-4">
        Manage categories, permissions, and other system-wide settings.
      </p>

      {/* Example section: Categories */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Categories</h2>
        <p>View, add, or edit system categories.</p>
      </section>

      {/* Example section: Permissions */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Permissions</h2>
        <p>Manage roles and access permissions for users.</p>
      </section>

      {/* Example section: Other settings */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Other Settings</h2>
        <p>Configure additional system-wide settings.</p>
      </section>
    </div>
  );
}
