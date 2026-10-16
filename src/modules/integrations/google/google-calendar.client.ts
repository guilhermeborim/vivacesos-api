import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import appConfig from '../../../config/app.config.js';

/** Escopos: criar agendas próprias do app e gerenciar eventos nelas; e-mail só para exibir quem conectou. */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.app.created',
  'openid',
  'email',
];

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
  }

  /** Refresh token revogado/expirado: precisa reconectar. */
  get isInvalidGrant() {
    return this.code === 'invalid_grant';
  }

  get isNotFound() {
    return this.status === 404 || this.status === 410;
  }
}

export interface GoogleEventInput {
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
}

/** Cliente fino da API do Google (fetch). Não guarda estado nem tokens. */
@Injectable()
export class GoogleCalendarClient {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  get configured() {
    const g = this.config.google;
    return !!(g.clientId && g.clientSecret && g.redirectUri);
  }

  authUrl(state: string) {
    const g = this.config.google;
    const params = new URLSearchParams({
      client_id: g.clientId ?? '',
      redirect_uri: g.redirectUri ?? '',
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });
    return `${g.authUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string) {
    const g = this.config.google;
    const body = await this.post<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      id_token?: string;
    }>(g.tokenUrl, {
      code,
      client_id: g.clientId ?? '',
      client_secret: g.clientSecret ?? '',
      redirect_uri: g.redirectUri ?? '',
      grant_type: 'authorization_code',
    });
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresIn: body.expires_in,
      email: body.id_token ? this.emailFromIdToken(body.id_token) : undefined,
    };
  }

  async refresh(refreshToken: string) {
    const g = this.config.google;
    const body = await this.post<{ access_token: string; expires_in: number }>(
      g.tokenUrl,
      {
        refresh_token: refreshToken,
        client_id: g.clientId ?? '',
        client_secret: g.clientSecret ?? '',
        grant_type: 'refresh_token',
      },
    );
    return { accessToken: body.access_token, expiresIn: body.expires_in };
  }

  async revoke(token: string) {
    try {
      await this.post(this.config.google.revokeUrl, { token });
    } catch {
      // Revogar é melhor esforço: o usuário pode já ter removido o acesso no Google.
    }
  }

  createCalendar(accessToken: string, summary: string, timeZone: string) {
    return this.api<{ id: string }>(accessToken, 'POST', '/calendars', {
      summary,
      timeZone,
    });
  }

  insertEvent(
    accessToken: string,
    calendarId: string,
    event: GoogleEventInput,
  ) {
    return this.api<{ id: string }>(
      accessToken,
      'POST',
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      this.eventBody(event),
    );
  }

  patchEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: GoogleEventInput,
  ) {
    return this.api<{ id: string }>(
      accessToken,
      'PATCH',
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      this.eventBody(event),
    );
  }

  async deleteEvent(accessToken: string, calendarId: string, eventId: string) {
    try {
      await this.api(
        accessToken,
        'DELETE',
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      );
    } catch (error) {
      // Já removido no Google: o resultado desejado.
      if (!(error instanceof GoogleApiError && error.isNotFound)) throw error;
    }
  }

  private eventBody(e: GoogleEventInput) {
    return {
      summary: e.summary,
      description: e.description,
      start: { dateTime: e.startsAt.toISOString(), timeZone: e.timeZone },
      end: { dateTime: e.endsAt.toISOString(), timeZone: e.timeZone },
    };
  }

  private emailFromIdToken(idToken: string) {
    try {
      const payload = JSON.parse(
        Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'),
      ) as { email?: string };
      return payload.email;
    } catch {
      return undefined;
    }
  }

  private async post<T>(url: string, form: Record<string, string>) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    });
    return this.parse<T>(response);
  }

  private async api<T = unknown>(
    accessToken: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ) {
    const response = await fetch(`${this.config.google.apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.parse<T>(response);
  }

  private async parse<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    const json = text ? (JSON.parse(text) as Record<string, any>) : {};
    if (!response.ok) {
      const code =
        typeof json.error === 'string'
          ? json.error
          : json.error?.errors?.[0]?.reason;
      throw new GoogleApiError(
        response.status,
        code,
        json.error_description ??
          json.error?.message ??
          `Google API ${response.status}`,
      );
    }
    return json as T;
  }
}
