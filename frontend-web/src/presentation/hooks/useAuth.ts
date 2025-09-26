// src/presentation/hooks/useAuth.ts
import { useState, useEffect } from "react";
import type { LoginUser } from "../../core/usecases/auth/loginUser";
import type { AuthRepository } from "../../core/repositories/AuthRepository";
import type { User } from "../../core/entities/User";

export const useAuth = (authRepo: AuthRepository) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const loginUseCase = new LoginUser(authRepo);
      const { user: loggedInUser } = await loginUseCase.execute(
        email,
        password
      );
      setUser(loggedInUser);
    } catch (err) {
      setError((err as Error).message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authRepo.logout();
    setUser(null);
  };

  const loadUser = async () => {
    setLoading(true);
    try {
      const currentUser = await authRepo.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser(); // auto-login on app load
  }, []);

  return { user, login, logout, loading, error };
};
