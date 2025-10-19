// 📂 src/components/Layout.tsx
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-[#FFF9ED]">
      {/* Sidebar */}
      <aside className="w-60 bg-[#FFF9ED] border-r border-amber-200">
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto bg-[#FFFAF0]">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
