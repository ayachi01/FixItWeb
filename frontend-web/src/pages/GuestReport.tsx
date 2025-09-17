// src/pages/GuestReport.tsx
import React, { useState, useEffect } from "react";
import type { GuestReportForm, Location } from "../types/index";
import axios from "axios";

const GuestReport: React.FC = () => {
  const [formData, setFormData] = useState<GuestReportForm>({
    guest_name: "",
    guest_email: "",
    guest_contact: "",
    description: "",
    category: "Cleaning",
    urgency: "Standard",
    location: 0, // default empty
    image: null,
  });

  const [status, setStatus] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);

  // 🔹 Fetch available locations from backend
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await axios.get<Location[]>(
          "http://127.0.0.1:8000/api/locations/"
        );
        setLocations(response.data);
      } catch (error) {
        console.error("Failed to load locations:", error);
      }
    };

    fetchLocations();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "location" ? Number(value) : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({
        ...prev,
        image: e.target.files![0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null) {
          formDataToSend.append(key, value as any);
        }
      });

      await axios.post(
        "http://127.0.0.1:8000/api/guest_reports/report_issue/",
        formDataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setStatus("Report submitted successfully!");
      setFormData({
        guest_name: "",
        guest_email: "",
        guest_contact: "",
        description: "",
        category: "Cleaning",
        urgency: "Standard",
        location: 0,
        image: null,
      });
    } catch (error: any) {
      console.error("Submission failed:", error);
      setStatus("Failed to submit report.");
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Submit Guest Report</h2>
      {status && <p className="mb-4 text-red-500">{status}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Guest Info */}
        <input
          type="text"
          name="guest_name"
          placeholder="Your Name"
          value={formData.guest_name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="email"
          name="guest_email"
          placeholder="Your Email"
          value={formData.guest_email}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="text"
          name="guest_contact"
          placeholder="Your Contact"
          value={formData.guest_contact}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        {/* Description */}
        <textarea
          name="description"
          placeholder="Issue Description"
          value={formData.description}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        {/* Category */}
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="Cleaning">Cleaning</option>
          <option value="Plumbing">Plumbing</option>
          <option value="Electrical">Electrical</option>
          <option value="Structural">Structural</option>
          <option value="HVAC">HVAC</option>
          <option value="Technology">Technology</option>
          <option value="Equipment">Equipment</option>
          <option value="Disturbance">Disturbance</option>
          <option value="Security">Security</option>
          <option value="Parking">Parking</option>
        </select>

        {/* Urgency */}
        <select
          name="urgency"
          value={formData.urgency}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="Standard">Standard</option>
          <option value="Urgent">Urgent</option>
        </select>

        {/* 🔹 Location Dropdown */}
        <select
          name="location"
          value={formData.location || ""}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="" disabled>
            Select Location
          </option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.building_name} - Floor {loc.floor_number} -{" "}
              {loc.room_identifier}
            </option>
          ))}
        </select>

        {/* Optional Image */}
        <input
          type="file"
          name="image"
          onChange={handleFileChange}
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Submit Report
        </button>
      </form>
    </div>
  );
};

export default GuestReport;
