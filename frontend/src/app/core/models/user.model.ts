export interface User {
  id: string;
  email: string;
  pseudo: string;
  bio: string | null;
  avatarPath: string | null;
  emailVerified: boolean;
  totpEnabled: boolean;
  role: 'user' | 'admin';
  createdAt: number;
}

export interface AuthTokens {
  accessToken: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  pseudo: string;
}
