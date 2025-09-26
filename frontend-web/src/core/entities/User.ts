// src/core/entities/User.ts
export type User = {
  id: number; // ✅ required if backend returns it
  email: string;
  role: string;
};
