// src/infrastructure/api/AuthApi.ts
import type { AuthRepository } from "../../core/repositories/AuthRepository";
import type { User } from "../../core/entities/User";

const TOKEN_KEY = "auth_token";

export class AuthApi implements AuthRepository {
  private baseUrl = "http://localhost:8000/api";

  async login(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    const res = await fetch(`${this.baseUrl}/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error("Invalid credentials");

    const data = await res.json();

    const user: User = {
      id: data.user_id,
      email: data.email,
      role: data.role,
    };

    localStorage.setItem(TOKEN_KEY, data.access); // store JWT
    return { user, token: data.access };
  }

  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
  }

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    // Optional: decode JWT to get user info
    // For now, minimal, just return null if token missing
    return null;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
