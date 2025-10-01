// 📂 src/pages/admin/Dashboard.tsx
import { useEffect, useState } from "react";
import { getAllTickets } from "../../api/tickets";
import { getAllUsers } from "../../api/users";

export default function Dashboard() {
  const [ticketCount, setTicketCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all tickets
        const tickets = await getAllTickets();
        setTicketCount(tickets.length);

        // Count pending tickets (status = "Created" or "Assigned")
        const pendingTickets = tickets.filter(
          (t: any) =>
            t.status === "Created" ||
            t.status === "Assigned" ||
            t.status === "In Progress"
        );
        setPendingCount(pendingTickets.length);

        // Fetch all users
        const users = await getAllUsers();
        setUserCount(users.length);
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📊 Admin Dashboard</h1>

      {loading ? (
        <p>Loading stats...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white shadow rounded p-4">
            <h2 className="text-lg font-semibold">Total Tickets</h2>
            <p className="text-3xl">{ticketCount}</p>
          </div>

          <div className="bg-white shadow rounded p-4">
            <h2 className="text-lg font-semibold">Users</h2>
            <p className="text-3xl">{userCount}</p>
          </div>

          <div className="bg-white shadow rounded p-4">
            <h2 className="text-lg font-semibold">Pending Tickets</h2>
            <p className="text-3xl">{pendingCount}</p>
          </div>
        </div>
      )}
    </div>
  );
}
