// 📂 src/pages/Dashboard/Dashboard.tsx
import { useEffect, useState } from "react";
import { getAllTickets } from "../../api/ticket";
import { getAllUsers } from "../../api/users";
import { useAuthStore } from "../../store/authStore";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const { user } = useAuthStore();
  const [ticketCount, setTicketCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [ticketsByStatus, setTicketsByStatus] = useState<any>({});
  const [ticketsByCategory, setTicketsByCategory] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const tickets = await getAllTickets();
        setTicketCount(tickets.length);

        const pendingTickets = tickets.filter(
          (t: any) =>
            t.status === "Created" ||
            t.status === "Assigned" ||
            t.status === "In Progress"
        );
        setPendingCount(pendingTickets.length);

        const users = await getAllUsers();
        setUserCount(users.length);

        const statusCounts: Record<string, number> = {};
        tickets.forEach((t: any) => {
          statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
        });
        setTicketsByStatus({
          labels: Object.keys(statusCounts),
          datasets: [
            {
              label: "Tickets by Status",
              data: Object.values(statusCounts),
              backgroundColor: [
                "#4f46e5",
                "#f59e0b",
                "#10b981",
                "#ef4444",
                "#3b82f6",
                "#8b5cf6",
                "#ec4899",
              ],
            },
          ],
        });

        const categoryCounts: Record<string, number> = {};
        tickets.forEach((t: any) => {
          categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
        });
        setTicketsByCategory({
          labels: Object.keys(categoryCounts),
          datasets: [
            {
              label: "Tickets by Category",
              data: Object.values(categoryCounts),
              backgroundColor: [
                "#f87171",
                "#34d399",
                "#60a5fa",
                "#fbbf24",
                "#a78bfa",
                "#f472b6",
                "#4ade80",
                "#facc15",
                "#38bdf8",
                "#fb7185",
              ],
            },
          ],
        });
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (!user) return <p>Loading user info...</p>;

  const { permissions } = user;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Dashboard</h1>

      {loading ? (
        <p>Loading stats...</p>
      ) : (
        <>
          {/* --- Counts --- */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Tickets visible to staff/fixers/admins */}
            {(permissions.can_report ||
              permissions.can_fix ||
              permissions.can_assign) && (
              <div className="bg-white shadow rounded p-4 text-center">
                <h2 className="text-lg font-semibold">Total Tickets</h2>
                <p className="text-3xl">{ticketCount}</p>
              </div>
            )}

            {/* User count only visible to admins */}
            {permissions.is_admin_level || permissions.can_manage_users ? (
              <div className="bg-white shadow rounded p-4 text-center">
                <h2 className="text-lg font-semibold">Users</h2>
                <p className="text-3xl">{userCount}</p>
              </div>
            ) : null}

            {/* Pending tickets visible to staff/fixers/admins */}
            {(permissions.can_fix || permissions.can_assign) && (
              <div className="bg-white shadow rounded p-4 text-center">
                <h2 className="text-lg font-semibold">Pending Tickets</h2>
                <p className="text-3xl">{pendingCount}</p>
              </div>
            )}
          </div>

          {/* --- Charts --- */}
          <div className="grid grid-cols-2 gap-6">
            {/* Tickets by Status for staff/fixers/admins */}
            {(permissions.can_fix ||
              permissions.can_assign ||
              permissions.can_report) && (
              <div className="bg-white shadow rounded p-4">
                <h2 className="text-lg font-semibold mb-2 text-center">
                  Tickets by Status
                </h2>
                <Bar data={ticketsByStatus} options={{ responsive: true }} />
              </div>
            )}

            {/* Tickets by Category for staff/fixers/admins */}
            {(permissions.can_fix ||
              permissions.can_assign ||
              permissions.can_report) && (
              <div className="bg-white shadow rounded p-4">
                <h2 className="text-lg font-semibold mb-2 text-center">
                  Tickets by Category
                </h2>
                <Pie data={ticketsByCategory} options={{ responsive: true }} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
