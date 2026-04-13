import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import type { UserProfile } from '../../core/services/profile.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly notifications = inject(NotificationService);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  profile = signal<UserProfile | null>(null);
  loading = signal(false);
  saving = signal(false);
  readonly uploadsBase = environment.apiUrl.replace('/api', '') + '/uploads/';

  // Change password
  showPasswordForm = signal(false);
  savingPassword = signal(false);
  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8),
      Validators.pattern(/[A-Z]/), Validators.pattern(/[0-9]/)]],
  });

  // Change email
  showEmailForm = signal(false);
  savingEmail = signal(false);
  emailForm = this.fb.group({
    newEmail: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  // 2FA
  totpSetupQr = signal<string | null>(null);
  totpSetupSecret = signal<string | null>(null);
  totpCodeForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  totpDisableForm = this.fb.group({
    password: ['', Validators.required],
  });
  savingTotp = signal(false);
  showDisable2FA = signal(false);

  form = this.fb.group({
    pseudo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30), Validators.pattern(/^[a-zA-Z0-9_\-]+$/)]],
    bio:    ['', Validators.maxLength(500)],
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.profileService.getMyProfile().subscribe({
      next: p => {
        this.profile.set(p);
        this.form.patchValue({ pseudo: p.pseudo, bio: p.bio ?? '' });
        this.loading.set(false);
      },
      error: () => { this.notifications.error('Impossible de charger le profil.'); this.loading.set(false); },
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.profileService.updateProfile(this.form.value as any).subscribe({
      next: p => { this.profile.set(p); this.notifications.success('Profil mis à jour.'); this.saving.set(false); },
      error: err => { this.notifications.error(err.error?.message ?? 'Erreur.'); this.saving.set(false); },
    });
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.profileService.updateAvatar(file).subscribe({
      next: p => { this.profile.set(p); this.notifications.success('Avatar mis à jour.'); },
      error: () => this.notifications.error('Erreur lors de l\'upload.'),
    });
  }

  // ── Change password ────────────────────────────────────────────────────────

  submitPasswordChange(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.savingPassword.set(true);
    const { currentPassword, newPassword } = this.passwordForm.value;
    this.profileService.changePassword(currentPassword!, newPassword!).subscribe({
      next: res => {
        this.notifications.success(res.message);
        this.passwordForm.reset();
        this.showPasswordForm.set(false);
        this.savingPassword.set(false);
      },
      error: err => { this.notifications.error(err.error?.message ?? 'Erreur.'); this.savingPassword.set(false); },
    });
  }

  // ── Change email ───────────────────────────────────────────────────────────

  submitEmailChange(): void {
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }
    this.savingEmail.set(true);
    const { newEmail, password } = this.emailForm.value;
    this.profileService.requestEmailChange(newEmail!, password!).subscribe({
      next: res => {
        this.notifications.success(res.message);
        this.emailForm.reset();
        this.showEmailForm.set(false);
        this.savingEmail.set(false);
      },
      error: err => { this.notifications.error(err.error?.message ?? 'Erreur.'); this.savingEmail.set(false); },
    });
  }

  // ── 2FA ────────────────────────────────────────────────────────────────────

  setup2FA(): void {
    this.savingTotp.set(true);
    this.authService.setup2FA().subscribe({
      next: res => {
        this.totpSetupQr.set(res.qrCodeDataUrl);
        this.totpSetupSecret.set(res.secret);
        this.savingTotp.set(false);
      },
      error: err => { this.notifications.error(err.error?.message ?? 'Erreur.'); this.savingTotp.set(false); },
    });
  }

  enable2FA(): void {
    if (this.totpCodeForm.invalid) { this.totpCodeForm.markAllAsTouched(); return; }
    this.savingTotp.set(true);
    this.authService.enable2FA(this.totpCodeForm.value.code!).subscribe({
      next: res => {
        this.notifications.success(res.message);
        this.totpSetupQr.set(null);
        this.totpSetupSecret.set(null);
        this.totpCodeForm.reset();
        this.savingTotp.set(false);
        // Update local profile state
        this.profile.update(p => p ? { ...p, totp_enabled: 1 } : p);
      },
      error: err => { this.notifications.error(err.error?.message ?? 'Code incorrect.'); this.savingTotp.set(false); },
    });
  }

  disable2FA(): void {
    if (this.totpDisableForm.invalid) { this.totpDisableForm.markAllAsTouched(); return; }
    this.savingTotp.set(true);
    this.authService.disable2FA(this.totpDisableForm.value.password!).subscribe({
      next: res => {
        this.notifications.success(res.message);
        this.totpDisableForm.reset();
        this.showDisable2FA.set(false);
        this.savingTotp.set(false);
        this.profile.update(p => p ? { ...p, totp_enabled: 0 } : p);
      },
      error: err => { this.notifications.error(err.error?.message ?? 'Erreur.'); this.savingTotp.set(false); },
    });
  }

  // ── GDPR / Danger zone ─────────────────────────────────────────────────────

  exportData(): void {
    this.profileService.exportData().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'cookpote-data.json'; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notifications.error('Export impossible.'),
    });
  }

  deleteAccount(): void {
    if (!confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return;
    this.profileService.deleteAccount().subscribe({
      next: () => this.authService.clearSession(),
      error: () => this.notifications.error('Erreur lors de la suppression.'),
    });
  }
}
