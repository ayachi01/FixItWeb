// 📂 src/api/users.ts
import { api } from "./client";

// 🔹 Fetch all users
export async function getAllUsers() {
  try {
    const res = await api.get("/users/");
    return res.data;
  } catch (err: any) {
    console.error(
      "❌ Error fetching users:",
      err.response?.data || err.message
    );
    throw err;
  }
}

// 🔹 Fetch single user by ID
export async function getUserById(id: number) {
  try {
    const res = await api.get(`/users/${id}/`);
    return res.data;
  } catch (err: any) {
    console.error(
      `❌ Error fetching user ${id}:`,
      err.response?.data || err.message
    );
    throw err;
  }
}

// 🔹 Create user
export async function createUser(userData: {
  first_name: string;
  last_name: string;
  email: string;
  role: number; // role ID
  password: string;
}) {
  try {
    const res = await api.post("/users/", userData);
    return res.data;
  } catch (err: any) {
    console.error("❌ Error creating user:", err.response?.data || err.message);
    throw err;
  }
}

// 🔹 Update user (partial update allowed)
export async function updateUser(
  id: number,
  userData: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    role: number;
    password?: string;
  }>
) {
  try {
    const res = await api.patch(`/users/${id}/`, userData);
    return res.data;
  } catch (err: any) {
    console.error(
      `❌ Error updating user ${id}:`,
      err.response?.data || err.message
    );
    throw err;
  }
}

// 🔹 Delete user
export async function deleteUser(id: number) {
  try {
    const res = await api.delete(`/users/${id}/`);
    return res.data;
  } catch (err: any) {
    console.error(
      `❌ Error deleting user ${id}:`,
      err.response?.data || err.message
    );
    throw err;
  }
}
