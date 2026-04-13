import { Injectable, signal } from '@angular/core';

/**
 * Manages the JWT access token.
 * Stored in memory (not localStorage) for XSS resistance.
 * On page reload, the auth interceptor triggers a silent refresh via httpOnly cookie.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private accessToken = signal<string | null>(null);

  getAccessToken(): string | null {
    return this.accessToken();
  }

  setAccessToken(token: string): void {
    this.accessToken.set(token);
  }

  clearAccessToken(): void {
    this.accessToken.set(null);
  }

  hasToken(): boolean {
    return this.accessToken() !== null;
  }
}
