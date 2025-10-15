import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFFFF]">
      {/* Header (optional) */}

      {/* Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-[250px] hidden md:block">
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto bg-[#FFFDF6]">
          <div className="max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
