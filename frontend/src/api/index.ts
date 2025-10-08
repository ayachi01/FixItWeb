// 📂 src/api/index.ts
export { api } from "./client";

// Auth APIs
export {
  login,
  register,
  getProfile,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
} from "./auth";

// User APIs
export * from "./users";

// Role APIs
export * from "./roles";

// Invite APIs — explicitly re-export to avoid collisions
export {
  getAllInvites,
  inviteValidate,
  createInvite,
  markInviteUsed,
  registerInvite,
} from "./invite";
