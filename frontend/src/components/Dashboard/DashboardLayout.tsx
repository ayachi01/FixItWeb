import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* 🔹 Header - full width at the top */}
      <Header />

      {/* 🔸 Below header: sidebar + content horizontally */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar (30% width) */}
        <aside className="w-[30%] bg-gray-900 text-white">
          <Sidebar />
        </aside>

        {/* Page content (70%) */}
        <main className="flex-1 p-6 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
