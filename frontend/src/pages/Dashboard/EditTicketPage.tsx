// 📂 src/pages/Dashboard/EditTicketPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
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

export default function EditTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [urgency, setUrgency] = useState(URGENCY_OPTIONS[0]);
  const [location, setLocation] = useState<number | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<
    { id: number; image_url: string; hash?: string }[]
  >([]);

  const [ticketData, setTicketData] = useState<any>(null);

  // ---------------------------
  // Fetch ticket data
  // ---------------------------
  useEffect(() => {
    if (!access || !id) return;

    const fetchTicket = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/tickets/${id}/`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        const ticket = res.data;
        setTicketData(ticket);
        setTitle(ticket.title);
        setDescription(ticket.description);
        setCategory(ticket.category);
        setUrgency(ticket.urgency);
        setExistingImages(ticket.images || []);
      } catch {
        toast.error("❌ Failed to load ticket data");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [access, id, navigate]);

  // ---------------------------
  // Fetch locations
  // ---------------------------
  useEffect(() => {
    if (!access) return;

    const fetchLocations = async () => {
      try {
        const res = await api.get("/locations/", {
          headers: { Authorization: `Bearer ${access}` },
        });
        const formatted = res.data.map((loc: any) => ({
          id: loc.id,
          name: `${loc.building_name} - Floor ${loc.floor_number} - ${loc.room_identifier}`,
        }));
        setLocations(formatted);
      } catch {
        toast.error("❌ Failed to load locations");
      }
    };

    fetchLocations();
  }, [access]);

  // ---------------------------
  // Set location once data loaded
  // ---------------------------
  useEffect(() => {
    if (ticketData && locations.length && location === null) {
      setLocation(ticketData.location);
    }
  }, [ticketData, locations, location]);

  // ---------------------------
  // Compute hash from binary
  // ---------------------------
  const getFileHash = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        let hash = 0;
        const view = new Uint8Array(buffer);
        for (let i = 0; i < view.length; i++) {
          hash = (hash << 5) - hash + view[i];
          hash |= 0;
        }
        resolve(hash.toString());
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

  // ---------------------------
  // Handle file selection (no duplicates)
  // ---------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);

    // Collect all existing hashes from old + new images
    const existingHashes = new Set([
      ...existingImages.map((img) => img.hash).filter(Boolean),
      ...images.map((img) => (img as any).hash).filter(Boolean),
    ]);

    const uniqueFiles: File[] = [];
    for (const file of newFiles) {
      const hash = await getFileHash(file);
      if (existingHashes.has(hash)) continue; // skip duplicates
      (file as any).hash = hash;
      uniqueFiles.push(file);
      existingHashes.add(hash);
    }

    if (uniqueFiles.length < newFiles.length) {
      toast.error("⚠️ Some duplicate images were skipped");
    }

    const combined = [...images, ...uniqueFiles].slice(
      0,
      3 - existingImages.length
    );
    setImages(combined);
    setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeNewImage = (idx: number) =>
    setImages(images.filter((_, i) => i !== idx));

  const removeExistingImage = (id: number) =>
    setExistingImages(existingImages.filter((img) => img.id !== id));

  // ---------------------------
  // Submit form
  // ---------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access || !location) return;
    if (!title.trim() || !description.trim())
      return toast.error("Title & Description required");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("urgency", urgency);
    formData.append("location", location.toString());
    images.forEach((img) => formData.append("image", img));
    existingImages.forEach((img) =>
      formData.append("existing_images", img.id.toString())
    );

    try {
      setSaving(true);
      await api.patch(`/tickets/${id}/`, formData, {
        headers: { Authorization: `Bearer ${access}` },
      });
      toast.success("✅ Ticket updated successfully");
      navigate(`/dashboard/tickets/${id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "❌ Failed to update ticket");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <p className="text-center mt-4">Loading ticket data...</p>;

  return (
    <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-center">✏️ Edit Ticket</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <select
          value={location ?? ""}
          onChange={(e) => setLocation(Number(e.target.value))}
          className="w-full p-3 border rounded-lg"
          disabled={locations.length === 0}
        >
          {locations.length === 0 ? (
            <option value="">Loading locations...</option>
          ) : (
            locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))
          )}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-3 border rounded-lg"
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
          className="w-full p-3 border rounded-lg"
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
          className="w-full p-3 border rounded-lg"
          rows={5}
        />

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="w-full p-3 border rounded-lg"
        />

        <div className="flex flex-wrap gap-2 mt-2">
          {existingImages.map((img) => (
            <div key={img.id} className="relative">
              <img
                src={img.image_url}
                alt=""
                className="w-20 h-20 object-cover rounded"
              />
              <button
                type="button"
                onClick={() => removeExistingImage(img.id)}
                className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
          {imagePreviews.map((src, idx) => (
            <div key={idx} className="relative">
              <img
                src={src}
                alt=""
                className="w-20 h-20 object-cover rounded"
              />
              <button
                type="button"
                onClick={() => removeNewImage(idx)}
                className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
