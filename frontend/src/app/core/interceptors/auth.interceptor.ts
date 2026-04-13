import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { throwError, BehaviorSubject, Observable } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Functional HTTP interceptor:
 * 1. Attaches Bearer access token to API requests.
 * 2. On 401: attempts a silent token refresh.
 * 3. Queues concurrent requests during refresh, then retries them.
 * 4. On refresh failure: clears session and redirects to login.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<any> => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  // Only intercept requests to our API
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const token = tokenService.getAccessToken();
  const authReq = token ? addAuthHeader(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Don't retry refresh endpoint itself
      if (req.url.includes('/auth/refresh') || req.url.includes('/auth/login')) {
        authService.clearSession();
        return throwError(() => error);
      }

      if (isRefreshing) {
        // Queue request until refresh completes
        return refreshTokenSubject.pipe(
          filter((token): token is string => token !== null),
          take(1),
          switchMap(newToken => next(addAuthHeader(req, newToken))),
        );
      }

      isRefreshing = true;
      refreshTokenSubject.next(null);

      return authService.refresh().pipe(
        switchMap(res => {
          isRefreshing = false;
          refreshTokenSubject.next(res.accessToken);
          return next(addAuthHeader(req, res.accessToken));
        }),
        catchError(refreshErr => {
          isRefreshing = false;
          authService.clearSession();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
