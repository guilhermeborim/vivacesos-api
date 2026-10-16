import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import appConfig from '../../config/app.config.js';
import { CryptoService } from '../../security/crypto.service.js';

/**
 * Link público de confirmação/cancelamento, sem tabela: `appointmentId.assinatura`, onde a
 * assinatura (HMAC) cobre o ID e o início da consulta. Reagendar muda o início e invalida os
 * links antigos sozinho; adulterar o ID invalida a assinatura.
 */
@Injectable()
export class AppointmentLinkService {
  private readonly signer;

  constructor(
    crypto: CryptoService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    this.signer = crypto.forField('appointment:link');
  }

  private sign(appointmentId: string, startsAt: Date) {
    return this.signer.hash(`${appointmentId}|${startsAt.getTime()}`);
  }

  create(appointmentId: string, startsAt: Date) {
    return `${appointmentId}.${this.sign(appointmentId, startsAt)}`;
  }

  url(token: string) {
    return `${this.config.appUrl}/c/${token}`;
  }

  /** Separa o ID do token (sem confiar nele ainda). */
  parseId(token: string) {
    const [id, signature, ...rest] = token.split('.');
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id ?? '',
      );
    if (!isUuid || !signature || rest.length) return null;
    return { id, signature };
  }

  verify(token: string, appointment: { id: string; startsAt: Date }) {
    const parsed = this.parseId(token);
    if (!parsed || parsed.id !== appointment.id) return false;
    const expected = Buffer.from(
      this.sign(appointment.id, appointment.startsAt),
    );
    const received = Buffer.from(parsed.signature);
    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  }
}
