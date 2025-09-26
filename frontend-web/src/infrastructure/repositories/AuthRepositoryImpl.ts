// src/data/repositories/AuthRepositoryImpl.ts
import type { User } from "../../entities/User";
import type { AuthRepository } from "../../repositories/AuthRepository";

export class AuthRepositoryImpl implements AuthRepository {
  async login(email: string, password: string): Promise<User> {
    const response = await fetch("http://localhost:8000/api/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();

    // Make sure it matches User type
    const user: User = {
      id: data.id, // must exist in User type
      email: data.email,
      role: data.role,
    };
    return user;
  }

  async logout(): Promise<void> {
    // call API if needed
  }
}
