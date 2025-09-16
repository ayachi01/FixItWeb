import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import type { Ticket, Notification } from "../types";

const Dashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        navigate("/login");
        return;
      }
      try {
        const ticketResponse = await axios.get<Ticket[]>(
          "http://127.0.0.1:8000/api/tickets/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setTickets(ticketResponse.data);
        const notifResponse = await axios.get<Notification[]>(
          "http://127.0.0.1:8000/api/notifications/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setNotifications(notifResponse.data);
      } catch (err) {
        setError("Failed to load data");
      }
    };
    fetchData();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Your Tickets</h3>
          {tickets.length === 0 ? (
            <p>No tickets found.</p>
          ) : (
            <ul className="space-y-4">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="bg-white p-4 rounded shadow">
                  <p>
                    <strong>Description:</strong> {ticket.description}
                  </p>
                  <p>
                    <strong>Status:</strong> {ticket.status}
                  </p>
                  <p>
                    <strong>Urgency:</strong> {ticket.urgency}
                  </p>
                  <p>
                    <strong>Category:</strong> {ticket.category}
                  </p>
                  <p>
                    <strong>Location:</strong> {ticket.location.building_name}{" "}
                    {ticket.location.room_identifier}
                  </p>
                  <p>
                    <strong>Reported By:</strong> {ticket.reported_by.email}
                  </p>
                  {ticket.assigned_to && (
                    <p>
                      <strong>Assigned To:</strong> {ticket.assigned_to.email}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold mb-4">Notifications</h3>
          {notifications.length === 0 ? (
            <p>No notifications found.</p>
          ) : (
            <ul className="space-y-4">
              {notifications.map((notif) => (
                <li key={notif.id} className="bg-white p-4 rounded shadow">
                  <p>
                    <strong>Message:</strong> {notif.message}
                  </p>
                  <p>
                    <strong>Status:</strong> {notif.is_read ? "Read" : "Unread"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("accessToken");
            navigate("/login");
          }}
          className="mt-4 bg-red-500 text-white p-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
