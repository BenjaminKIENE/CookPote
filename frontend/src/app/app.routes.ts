import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  // ── Public routes ──────────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
    canActivate: [noAuthGuard],
    title: 'Cookpote — Ton carnet de recettes entre amis',
  },

  // ── Auth routes (redirect to /app/feed if already logged in) ──────────────
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    canActivate: [noAuthGuard],
    title: 'Connexion — Cookpote',
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent),
    canActivate: [noAuthGuard],
    title: 'Créer un compte — Cookpote',
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email.component').then(m => m.VerifyEmailComponent),
    title: 'Vérification email — Cookpote',
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [noAuthGuard],
    title: 'Mot de passe oublié — Cookpote',
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent),
    title: 'Réinitialiser le mot de passe — Cookpote',
  },
  {
    path: 'login/2fa',
    loadComponent: () => import('./features/auth/totp-challenge.component').then(m => m.TotpChallengeComponent),
    canActivate: [noAuthGuard],
    title: 'Double authentification — Cookpote',
  },

  // ── App routes (require auth) ──────────────────────────────────────────────
  {
    path: 'app',
    loadComponent: () => import('./shared/layout/app-layout.component').then(m => m.AppLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'feed', pathMatch: 'full' },
      {
        path: 'feed',
        loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent),
        title: 'Découvrir — Cookpote',
      },
      {
        path: 'recipes',
        loadComponent: () => import('./features/recipes/recipe-list.component').then(m => m.RecipeListComponent),
        title: 'Mes recettes — Cookpote',
      },
      {
        path: 'recipes/new',
        loadComponent: () => import('./features/recipes/recipe-form.component').then(m => m.RecipeFormComponent),
        title: 'Nouvelle recette — Cookpote',
      },
      {
        path: 'recipes/:id',
        loadComponent: () => import('./features/recipes/recipe-detail.component').then(m => m.RecipeDetailComponent),
        title: 'Recette — Cookpote',
      },
      {
        path: 'recipes/:id/edit',
        loadComponent: () => import('./features/recipes/recipe-form.component').then(m => m.RecipeFormComponent),
        title: 'Modifier la recette — Cookpote',
      },
      {
        path: 'scan',
        loadComponent: () => import('./features/scan-fridge/scan-fridge.component').then(m => m.ScanFridgeComponent),
        title: 'Scan Frigo — Cookpote',
      },
      {
        path: 'matching',
        loadComponent: () => import('./features/matching/manual-matching.component').then(m => m.ManualMatchingComponent),
        title: "Qu'est-ce que j'ai ? — Cookpote",
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
        title: 'Mon profil — Cookpote',
      },
    ],
  },

  // ── Legal pages ────────────────────────────────────────────────────────────
  {
    path: 'mentions-legales',
    loadComponent: () => import('./features/legal/mentions.component').then(m => m.MentionsComponent),
    title: 'Mentions légales — Cookpote',
  },
  {
    path: 'confidentialite',
    loadComponent: () => import('./features/legal/privacy.component').then(m => m.PrivacyComponent),
    title: 'Politique de confidentialité — Cookpote',
  },
  {
    path: 'cgu',
    loadComponent: () => import('./features/legal/cgu.component').then(m => m.CguComponent),
    title: 'CGU — Cookpote',
  },

  // ── 404 ────────────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
