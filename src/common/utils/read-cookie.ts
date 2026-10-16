import type { Request } from 'express';

/**
 * Lê um cookie fora de handlers (ex.: guards), onde `@Cookies()` não existe.
 * O cookie support nativo do Nest não preenche `request.cookies`.
 */
export function readCookie(request: Request, name: string): string | undefined {
  for (const part of request.headers.cookie?.split(';') ?? []) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
