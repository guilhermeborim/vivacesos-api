import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { JwtErrorType } from '../common/enums/jwt-error-type.enum.js';
import jwtConfig from '../config/jwt.config.js';

export interface AccessTokenPayload {
  /** ID do usuário. */
  sub: string;
  clinicId?: string;
}

export interface RefreshToken {
  /** Valor enviado ao cliente. Nunca persistir. */
  token: string;
  /** SHA-256 do token. Persistir este valor. */
  tokenHash: string;
  expiresAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refresh: RefreshToken;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  /** Algoritmo, issuer, audience e expiração vêm da config do JwtModule. */
  generateAccessToken({ sub, clinicId }: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync({ sub, clinicId });
  }

  /** Token opaco. O servidor guarda só o hash, com rotação a cada uso. */
  generateRefreshToken(): RefreshToken {
    const token = randomBytes(32).toString('base64url');
    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: new Date(
        Date.now() + this.config.refreshExpiresInSeconds * 1000,
      ),
    };
  }

  async generateTokenPair(payload: AccessTokenPayload): Promise<TokenPair> {
    return {
      accessToken: await this.generateAccessToken(payload),
      refresh: this.generateRefreshToken(),
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    let decoded: unknown;
    try {
      decoded = await this.jwt.verifyAsync(token);
    } catch (error) {
      const expired = (error as Error).name === 'TokenExpiredError';
      throw new UnauthorizedException({
        message: expired ? 'Token expirado' : 'Token inválido',
        errorType: expired
          ? JwtErrorType.TOKEN_EXPIRED
          : JwtErrorType.TOKEN_INVALID,
        code: 'JWT_ERROR',
      });
    }
    if (!this.isPayload(decoded)) {
      throw new UnauthorizedException({
        message: 'Token inválido',
        errorType: JwtErrorType.TOKEN_INVALID,
        code: 'JWT_ERROR',
      });
    }
    return { sub: decoded.sub, clinicId: decoded.clinicId };
  }

  /** Use para buscar o refresh token no banco. */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  isRefreshTokenExpired(expiresAt: Date): boolean {
    return expiresAt.getTime() <= Date.now();
  }

  private isPayload(value: unknown): value is AccessTokenPayload {
    if (typeof value !== 'object' || value === null) return false;
    const { sub, clinicId } = value as Record<string, unknown>;
    return (
      typeof sub === 'string' &&
      (clinicId === undefined || typeof clinicId === 'string')
    );
  }
}
