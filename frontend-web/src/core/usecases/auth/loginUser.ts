// src/core/usecases/auth/LoginUser.ts
import type { User } from "../../entities/User";
import type { AuthRepository } from "../../repositories/AuthRepository";

export class LoginUser {
  private readonly authRepo: AuthRepository;

  constructor(authRepo: AuthRepository) {
    this.authRepo = authRepo;
  }

  async execute(email: string, password: string): Promise<User> {
    return this.authRepo.login(email, password);
  }
}
