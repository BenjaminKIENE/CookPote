import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly success = signal(false);
  readonly errorMessage = signal('Lien invalide ou expiré.');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      return;
    }

    this.http.post(`${environment.apiUrl}/auth/verify-email`, { token }).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Lien invalide ou expiré.');
      },
    });
  }

  resend(): void {
    // Navigate to a page where the user can enter their email to resend
  }
}
