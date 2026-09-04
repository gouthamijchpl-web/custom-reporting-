/** Account settings payloads exchanged with /api/v1/settings. */

export interface UpdateAccountRequest {
  fullName: string;
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}
