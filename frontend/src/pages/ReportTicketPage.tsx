// src/pages/ReportTicketPage.tsx
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { api } from "../api/client"; // 🔹 named import

interface Location {
  id: number;
  name: string;
}

const CATEGORY_OPTIONS = [
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Structural",
  "HVAC",
  "Technology",
  "Equipment",
  "Disturbance",
  "Security",
  "Parking",
];

const URGENCY_OPTIONS = ["Standard", "Urgent"];

export default function ReportTicketPage() {
  const { access } = useAuthStore(); // Use access token from auth store
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [urgency, setUrgency] = useState(URGENCY_OPTIONS[0]);
  const [location, setLocation] = useState<number | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔹 Fetch locations from API
  useEffect(() => {
    const fetchLocations = async () => {
      if (!access) return;
      try {
        const res = await api.get("/locations/", {
          headers: { Authorization: `Bearer ${access}` },
        });

        const formatted = res.data.map((loc: any) => ({
          id: loc.id,
          name: `${loc.building_name} - Floor ${loc.floor_number} - ${loc.room_identifier}`,
        }));

        setLocations(formatted);
        setLocation(formatted[0]?.id || null);
      } catch (err) {
        console.error("Failed to fetch locations:", err);
        setMessage("❌ Failed to load locations. Please try again.");
      }
    };
    fetchLocations();
  }, [access]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access || !location) return;

    setLoading(true);
    setMessage("");

    try {
      await api.post(
        "/tickets/",
        { description, category, urgency, location },
        { headers: { Authorization: `Bearer ${access}` } }
      );

      setMessage("✅ Ticket submitted successfully!");
      setDescription("");
      setCategory(CATEGORY_OPTIONS[0]);
      setUrgency(URGENCY_OPTIONS[0]);
      setLocation(locations[0]?.id || null);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "❌ Failed to submit ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">📝 Report a Ticket</h1>

      {message && (
        <p
          className={`mb-3 p-2 rounded ${
            message.includes("✅")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          value={location || ""}
          onChange={(e) => setLocation(Number(e.target.value))}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        >
          <option value="" disabled>
            Select Location
          </option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        >
          {URGENCY_OPTIONS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          rows={5}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-semibold ${
            loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Submitting..." : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}
