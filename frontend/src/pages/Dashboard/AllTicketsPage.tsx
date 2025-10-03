// 📂 src/pages/admin/TicketsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client"; // your axios instance

interface User {
  id: number;
  full_name: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  reporter?: User;
  assignees?: User[];
  created_at: string;
}

interface CurrentUser {
  id: number;
  full_name: string;
  can_assign: boolean;
  can_fix: boolean;
  can_close_tickets: boolean;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [assignOptions, setAssignOptions] = useState<User[]>([]);
  const [assignTicketId, setAssignTicketId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ticketsRes, userRes] = await Promise.all([
          api.get("/tickets/"),
          api.get("/auth/profile/"),
        ]);

        // Format tickets
        const formatted: Ticket[] = ticketsRes.data.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          urgency: t.urgency ?? "Standard",
          status: t.status,
          reporter: t.reporter
            ? {
                id: t.reporter.id,
                full_name:
                  t.reporter.first_name || t.reporter.last_name
                    ? `${t.reporter.first_name} ${t.reporter.last_name}`.trim()
                    : t.reporter.email,
              }
            : undefined,
          assignees:
            t.assignments?.map((a: any) => ({
              id: a.user.id,
              full_name:
                a.user.first_name || a.user.last_name
                  ? `${a.user.first_name} ${a.user.last_name}`.trim()
                  : a.user.email,
            })) ?? [],
          created_at: t.created_at,
        }));

        setTickets(formatted);
        setFilteredTickets(formatted);
        setCurrentUser(userRes.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load tickets");
        console.error("Error fetching tickets:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const query = search.toLowerCase();
    const filtered = tickets.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.status.toLowerCase().includes(query) ||
        t.reporter?.full_name.toLowerCase().includes(query)
    );
    setFilteredTickets(filtered);
    setCurrentPage(1);
  }, [search, tickets]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedTickets = filteredTickets.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // -------------------- Actions --------------------
  const handleAssignClick = async (ticket: Ticket) => {
    try {
      const res = await api.get(`/tickets/${ticket.id}/eligible_fixers/`);
      if (!res.data.length) {
        alert("No eligible fixers available for this ticket.");
        return;
      }
      setAssignOptions(res.data);
      setAssignTicketId(ticket.id);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to fetch eligible fixers");
    }
  };

  const handleAssign = async (userId: number) => {
    if (!assignTicketId) return;
    try {
      await api.post(`/tickets/${assignTicketId}/assign/`, {
        assignee_id: userId,
      });
      alert("Ticket assigned successfully");
      const updated = await api.get("/tickets/");
      setTickets(updated.data);
      setAssignTicketId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to assign ticket");
    }
  };

  const handleResolve = async (ticket: Ticket) => {
    const resolution = prompt("Enter resolution details:");
    if (!resolution) return;
    try {
      await api.post(`/tickets/${ticket.id}/resolve/`, { resolution });
      alert("Ticket resolved successfully");
      const updated = await api.get("/tickets/");
      setTickets(updated.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to resolve ticket");
    }
  };

  const handleClose = async (ticket: Ticket) => {
    try {
      await api.post(`/tickets/${ticket.id}/close/`);
      alert("Ticket closed successfully");
      const updated = await api.get("/tickets/");
      setTickets(updated.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to close ticket");
    }
  };

  if (loading) return <p className="p-4">Loading tickets...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🎫 All Tickets</h1>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0 md:space-x-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, reporter, status, or category..."
          className="p-2 border rounded w-full md:w-1/2"
        />
        <div className="flex items-center space-x-2">
          <label htmlFor="pageSize" className="text-sm">
            Items per page:
          </label>
          <select
            id="pageSize"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="p-1 border rounded"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = Number(e.target.value);
              if (page >= 1 && page <= totalPages) setCurrentPage(page);
            }}
            className="p-1 border rounded w-16"
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Title</th>
              <th className="p-2">Category</th>
              <th className="p-2">Urgency</th>
              <th className="p-2">Status</th>
              <th className="p-2">Reporter</th>
              <th className="p-2">Assignees</th>
              <th className="p-2">Assignee Count</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedTickets.map((ticket) => {
              const status = ticket.status.toLowerCase();
              return (
                <tr
                  key={ticket.id}
                  className={`border-t hover:bg-gray-50 ${
                    ticket.urgency === "Urgent" ? "bg-red-50" : ""
                  }`}
                >
                  <td className="p-2">{ticket.id}</td>
                  <td className="p-2">{ticket.title}</td>
                  <td className="p-2">{ticket.category}</td>
                  <td className="p-2 font-semibold">
                    {ticket.urgency === "Urgent" ? (
                      <span className="text-red-600">{ticket.urgency}</span>
                    ) : (
                      ticket.urgency
                    )}
                  </td>
                  <td className="p-2">{ticket.status}</td>
                  <td className="p-2">{ticket.reporter?.full_name || "—"}</td>
                  <td className="p-2">
                    {ticket.assignees?.length
                      ? ticket.assignees.map((a) => (
                          <span
                            key={a.id}
                            className="inline-block bg-gray-200 px-2 py-1 mr-1 rounded"
                          >
                            {a.full_name}
                          </span>
                        ))
                      : "—"}
                  </td>
                  <td className="p-2">{ticket.assignees?.length || 0}</td>
                  <td className="p-2">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-2 space-x-1">
                    <button
                      onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>

                    {currentUser?.can_assign && status !== "closed" && (
                      <button
                        onClick={() => handleAssignClick(ticket)}
                        className="text-green-600 hover:underline"
                      >
                        Assign
                      </button>
                    )}
                    {currentUser?.can_fix && status === "assigned" && (
                      <button
                        onClick={() => handleResolve(ticket)}
                        className="text-orange-600 hover:underline"
                      >
                        Resolve
                      </button>
                    )}
                    {currentUser?.can_close_tickets && status !== "closed" && (
                      <button
                        onClick={() => handleClose(ticket)}
                        className="text-red-600 hover:underline"
                      >
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Assign modal */}
      {assignTicketId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg w-80">
            <h2 className="font-bold mb-2">Select Assignee</h2>
            {assignOptions.map((user) => (
              <button
                key={user.id}
                onClick={() => handleAssign(user.id)}
                className="block w-full text-left p-2 hover:bg-gray-100 rounded"
              >
                {user.full_name}
              </button>
            ))}
            <button
              onClick={() => setAssignTicketId(null)}
              className="mt-2 px-3 py-1 border rounded bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
