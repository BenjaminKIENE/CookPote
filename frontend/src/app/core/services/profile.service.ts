import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  email: string;
  pseudo: string;
  bio: string | null;
  avatar_path: string | null;
  email_verified: 0 | 1;
  totp_enabled: 0 | 1;
  role: 'user' | 'admin';
  created_at: number;
  recipe_count: number;
}

export interface UpdateProfilePayload {
  pseudo?: string;
  bio?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/profile`;

  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.api}/me`);
  }

  updateProfile(payload: UpdateProfilePayload): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.api}/me`, payload);
  }

  updateAvatar(file: File): Observable<UserProfile> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UserProfile>(`${this.api}/me/avatar`, form);
  }

  exportData(): Observable<Blob> {
    return this.http.get(`${this.api}/me/export`, { responseType: 'blob' });
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.api}/me`);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/me/change-password`, { currentPassword, newPassword });
  }

  requestEmailChange(newEmail: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/me/request-email-change`, { newEmail, password });
  }
}
