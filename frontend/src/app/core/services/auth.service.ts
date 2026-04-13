import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { TokenService } from './token.service';
import type { User, AuthTokens, LoginPayload, RegisterPayload } from '../models/user.model';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  accessToken: string;
  user: User;
  requires2FA?: boolean;
  tempToken?: string;
}

interface RefreshResponse {
  accessToken: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);

  private readonly apiUrl = environment.apiUrl;

  // Reactive current user — components can inject and use this signal
  readonly currentUser = signal<User | null>(null);

  isLoggedIn(): boolean {
    return this.tokenService.hasToken() && this.currentUser() !== null;
  }

  /**
   * Called on app init to restore session via httpOnly refresh token cookie.
   * Returns observable that resolves once we know if user is authenticated.
   */
  tryRestoreSession(): Observable<RefreshResponse> {
    return this.http
      .post<RefreshResponse>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap(res => {
          this.tokenService.setAccessToken(res.accessToken);
          this.currentUser.set(res.user);
        }),
      );
  }

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, payload, { withCredentials: true })
      .pipe(
        tap(res => {
          if (!res.requires2FA) {
            this.tokenService.setAccessToken(res.accessToken);
            this.currentUser.set(res.user);
          }
        }),
      );
  }

  register(payload: RegisterPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/register`, payload);
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => this.clearSession()),
      );
  }

  refresh(): Observable<RefreshResponse> {
    return this.http
      .post<RefreshResponse>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap(res => {
          this.tokenService.setAccessToken(res.accessToken);
          this.currentUser.set(res.user);
        }),
      );
  }

  verify2FA(code: string, tempToken: string): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${this.apiUrl}/auth/2fa/verify`, { code, tempToken }, { withCredentials: true })
      .pipe(
        tap(res => {
          this.tokenService.setAccessToken(res.accessToken);
          this.currentUser.set(res.user);
        }),
      );
  }

  setup2FA(): Observable<{ qrCodeDataUrl: string; secret: string }> {
    return this.http.post<{ qrCodeDataUrl: string; secret: string }>(`${this.apiUrl}/auth/2fa/setup`, {});
  }

  enable2FA(code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/2fa/enable`, { code });
  }

  disable2FA(password: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/auth/2fa/disable`, { body: { password } });
  }

  clearSession(): void {
    this.tokenService.clearAccessToken();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
