// 📂 src/pages/tickets/SubmitTicketPage.tsx
import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../api/client";
import { toast } from "react-hot-toast";

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

export default function SubmitTicketPage() {
  const { access } = useAuthStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [urgency, setUrgency] = useState(URGENCY_OPTIONS[0]);
  const [location, setLocation] = useState<number | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch locations
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
      } catch {
        toast.error("❌ Failed to load locations. Please try again.");
      }
    };
    fetchLocations();
  }, [access]);

  // Handle file selection (cumulative, max 3)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const combinedFiles = [...images, ...newFiles].slice(0, 3); // max 3 total
    setImages(combinedFiles);
    setImagePreviews(combinedFiles.map((file) => URL.createObjectURL(file)));
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit ticket
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access || !location) return;

    // Client-side validation
    if (!title.trim()) return toast.error("Title is required");
    if (!description.trim()) return toast.error("Description is required");
    if (images.length < 1) return toast.error("At least 1 image is required");
    if (images.length > 3) return toast.error("Maximum 3 images allowed");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("urgency", urgency);
    formData.append("location", location.toString());

    // Append each image correctly as `image` (matches DRF serializer)
    images.forEach((img) => formData.append("image", img));

    try {
      setLoading(true);
      await api.post("/tickets/", formData, {
        headers: {
          Authorization: `Bearer ${access}`,
          // ✅ Remove Content-Type, Axios sets it automatically
        },
      });
      toast.success("✅ Ticket submitted successfully!");

      // Reset form
      setTitle("");
      setDescription("");
      setCategory(CATEGORY_OPTIONS[0]);
      setUrgency(URGENCY_OPTIONS[0]);
      setLocation(locations[0]?.id || null);
      setImages([]);
      setImagePreviews([]);
    } catch (err: any) {
      console.error(err.response);
      toast.error(
        err.response?.data?.detail ||
          (err.response?.data?.image
            ? err.response.data.image[0]
            : "❌ Failed to submit ticket")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">📝 Report a Ticket</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />

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

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="w-full p-3 border rounded-lg"
        />

        {imagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="relative">
                <img
                  src={src}
                  alt={`preview-${idx}`}
                  className="w-20 h-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

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
