import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function NotificationsPage() {
  const navigate = useNavigate();

  const notifications = [
    {
      id: 1,
      title: "New report submitted",
      message: "Jenny Wilson submitted a new report: Broken Chairs",
      time: "5 mins ago",
    },
    {
      id: 2,
      title: "Report Resolved",
      message: "Jordan Reyes marked Flickering Lights as resolved",
      time: "1 hour ago",
    },
  ];

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>

      <div className="bg-white shadow-md rounded-xl p-6">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className="border-b last:border-none py-4 flex justify-between"
          >
            <div>
              <h2 className="font-semibold">{notif.title}</h2>
              <p className="text-gray-600 text-sm">{notif.message}</p>
            </div>
            <span className="text-gray-400 text-xs">{notif.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
