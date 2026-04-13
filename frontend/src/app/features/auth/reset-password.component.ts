import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm  = control.get('confirm')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8),
                    Validators.pattern(/[A-Z]/), Validators.pattern(/[0-9]/)]],
    confirm:  ['', [Validators.required]],
  }, { validators: passwordMatchValidator });

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly tokenInvalid = signal(false);
  readonly errorMessage = signal('');
  private token = '';

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token');
    if (!t) { this.tokenInvalid.set(true); return; }
    this.token = t;
  }

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.invalid || !control.touched) return '';
    const e = control.errors;
    if (e?.['required'])  return 'Ce champ est requis.';
    if (e?.['minlength']) return 'Minimum 8 caractères.';
    if (e?.['pattern'])   return 'Au moins une majuscule et un chiffre requis.';
    if (field === 'confirm' && this.form.errors?.['mismatch']) return 'Les mots de passe ne correspondent pas.';
    return '';
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.errorMessage.set('');

    this.http.post(`${environment.apiUrl}/auth/reset-password`, {
      token: this.token,
      password: this.form.value.password,
    }).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 400) { this.tokenInvalid.set(true); return; }
        this.errorMessage.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }
}
