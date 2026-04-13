import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    // Attempt to restore session via httpOnly refresh token cookie on app load
    this.authService.tryRestoreSession().subscribe({
      error: () => { /* No session to restore — expected on fresh visit */ },
    });
  }
}
