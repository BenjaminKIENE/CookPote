import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly errorMessage = signal('');

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.invalid || !control.touched) return '';
    if (control.errors?.['required']) return 'Ce champ est requis.';
    if (control.errors?.['email'])    return 'Email invalide.';
    return '';
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.errorMessage.set('');

    this.http.post(`${environment.apiUrl}/auth/forgot-password`, this.form.value).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }
}
