import { api } from "./client";

// Fetch all users
export async function getAllUsers() {
  const res = await api.get("/users/");
  return res.data;
}

// Fetch single user
export async function getUserById(id: number) {
  const res = await api.get(`/users/${id}/`);
  return res.data;
}

// Create user
export async function createUser(userData: {
  first_name: string;
  last_name: string;
  email: string;
  role: number; // role ID
  password: string;
}) {
  const res = await api.post("/users/", userData);
  return res.data;
}

// Update user
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
  const res = await api.patch(`/users/${id}/`, userData);
  return res.data;
}

// Delete user
export async function deleteUser(id: number) {
  const res = await api.delete(`/users/${id}/`);
  return res.data;
}
