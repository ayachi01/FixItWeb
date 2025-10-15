import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Bell } from "lucide-react";

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
  const navigate = useNavigate();
  const [ticketCount, setTicketCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [ticketsByCategory, setTicketsByCategory] = useState<any>({});
  const [reportsOverTime, setReportsOverTime] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([
    "New report submitted by Jenny Wilson",
    "Flickering lights issue marked as Resolved",
  ]);

  useEffect(() => {
    async function loadData() {
      if (!user?.permissions) return setLoading(false);

      try {
        let tickets: any[] = [];
        if (
          user.permissions.can_report ||
          user.permissions.can_fix ||
          user.permissions.can_assign
        ) {
          tickets = await getAllTickets();
          setTicketCount(tickets.length);

          const resolved = tickets.filter((t: any) => t.status === "Resolved");
          setResolvedCount(resolved.length);

          const categoryCounts: Record<string, number> = {};
          tickets.forEach((t: any) => {
            categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
          });
          setTicketsByCategory({
            labels: Object.keys(categoryCounts),
            datasets: [
              {
                data: Object.values(categoryCounts),
                backgroundColor: [
                  "#8B5CF6",
                  "#3B82F6",
                  "#10B981",
                  "#F97316",
                  "#EF4444",
                  "#6B7280",
                ],
              },
            ],
          });

          const monthCounts: Record<string, number> = {};
          tickets.forEach((t: any) => {
            const month = new Date(t.createdAt).toLocaleString("default", {
              month: "long",
            });
            monthCounts[month] = (monthCounts[month] || 0) + 1;
          });
          setReportsOverTime({
            labels: Object.keys(monthCounts),
            datasets: [
              {
                label: "Reports",
                data: Object.values(monthCounts),
                backgroundColor: "#047857",
                borderRadius: 6,
              },
            ],
          });
        }

        if (
          user.permissions.is_admin_level ||
          user.permissions.can_manage_users
        ) {
          const users = await getAllUsers();
          setUserCount(users.length);
        }
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (!user) return <p>Loading user info...</p>;

  const handleNotificationClick = () => {
    navigate("/dashboard/notifications");
  };

  return (
    <div className="p-8 min-h-screen bg-white">
      {/* 🔝 Top Bar */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <div className="flex items-center gap-4">
          {/* 🔔 Notification Icon */}
          <button
            onClick={handleNotificationClick}
            className="relative p-2 border-2 border-black rounded-md hover:bg-gray-100 transition duration-200 shadow-sm"
          >
            <Bell className="w-6 h-6 text-black" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

      </div>

      {loading ? (
        <p>Loading stats...</p>
      ) : (
        <>
          {/* 🌟 Top Statistic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 text-white p-6 rounded-xl shadow-lg">
              <h2 className="text-4xl font-bold mb-1">{userCount}</h2>
              <p className="text-sm uppercase tracking-wide">Total Users</p>
            </div>

            <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white p-6 rounded-xl shadow-lg">
              <h2 className="text-4xl font-bold mb-1">{ticketCount}</h2>
              <p className="text-sm uppercase tracking-wide">Total Reports</p>
            </div>

            <div className="bg-gradient-to-br from-green-600 to-green-800 text-white p-6 rounded-xl shadow-lg">
              <h2 className="text-4xl font-bold mb-1">{resolvedCount}</h2>
              <p className="text-sm uppercase tracking-wide">Resolved Issues</p>
            </div>
          </div>

          {/* 📊 Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border">
              <h2 className="text-lg font-bold mb-4">Reports By Category</h2>
              <div className="h-[300px]">
                <Pie
                  data={ticketsByCategory}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "right" },
                    },
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border">
              <h2 className="text-lg font-bold mb-4">Reports Over Time</h2>
              <div className="h-[300px]">
                <Bar
                  data={reportsOverTime}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>
          </div>


        </>
      )}
    </div>
  );
}
