import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    pseudo:   ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30),
                    Validators.pattern(/^[a-zA-Z0-9_\-]+$/)]],
    password: ['', [Validators.required, Validators.minLength(8),
                    Validators.pattern(/[A-Z]/), Validators.pattern(/[0-9]/)]],
  });

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly errorMessage = signal('');

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.invalid || !control.touched) return '';
    const e = control.errors;
    if (e?.['required'])   return 'Ce champ est requis.';
    if (e?.['email'])      return 'Email invalide.';
    if (e?.['minlength'])  return `Minimum ${e['minlength'].requiredLength} caractères.`;
    if (e?.['maxlength'])  return `Maximum ${e['maxlength'].requiredLength} caractères.`;
    if (e?.['pattern']) {
      if (field === 'pseudo')   return 'Lettres, chiffres, _ et - uniquement.';
      if (field === 'password') return 'Au moins une majuscule et un chiffre requis.';
    }
    return '';
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.errorMessage.set('');
    const { email, pseudo, password } = this.form.value;

    this.authService.register({ email: email!, pseudo: pseudo!, password: password! }).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }
}
