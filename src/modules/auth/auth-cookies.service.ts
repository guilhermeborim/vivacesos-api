import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import type { Response } from 'express';
import appConfig from '../../config/app.config.js';
import jwtConfig from '../../config/jwt.config.js';

export const ACCESS_TOKEN_COOKIE = 'token';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

/** Cookies de sessão. `maxAge` em segundos (padrão do Nest). */
@Injectable()
export class AuthCookiesService {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(jwtConfig.KEY) private readonly jwt: ConfigType<typeof jwtConfig>,
  ) {}

  setAccessToken(res: Response, token: string) {
    this.set(res, ACCESS_TOKEN_COOKIE, token, this.jwt.expiresInSeconds);
  }

  setRefreshToken(res: Response, token: string) {
    this.set(
      res,
      REFRESH_TOKEN_COOKIE,
      token,
      this.jwt.refreshExpiresInSeconds,
    );
  }

  clear(res: Response) {
    const { httpAdapter } = this.adapterHost;
    httpAdapter.clearCookie(res, ACCESS_TOKEN_COOKIE, { path: '/' });
    httpAdapter.clearCookie(res, REFRESH_TOKEN_COOKIE, { path: '/' });
  }

  private set(res: Response, name: string, value: string, maxAge: number) {
    this.adapterHost.httpAdapter.setCookie(res, name, value, {
      httpOnly: true,
      path: '/',
      maxAge,
      sameSite: this.app.isProduction ? 'none' : 'lax',
      secure: this.app.isProduction,
    });
  }
}
