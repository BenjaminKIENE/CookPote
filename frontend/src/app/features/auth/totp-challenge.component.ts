import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-totp-challenge',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './totp-challenge.component.html',
  styleUrl: './totp-challenge.component.scss',
})
export class TotpChallengeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  private tempToken = '';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('tempToken');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    this.tempToken = token;
  }

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.invalid || !control.touched) return '';
    if (control.errors?.['required']) return 'Ce champ est requis.';
    if (control.errors?.['pattern'])  return 'Le code doit contenir 6 chiffres.';
    return '';
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.verify2FA(this.form.value.code!, this.tempToken).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/app/feed']); },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Code incorrect.');
        this.form.get('code')?.reset();
      },
    });
  }
}
