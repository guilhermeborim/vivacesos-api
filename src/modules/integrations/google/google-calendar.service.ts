import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  INTEGRATION_DISCONNECTED,
  type IntegrationDisconnectedEvent,
} from '../../../common/events/domain.events.js';
import { CLINIC_TZ } from '../../../common/utils/clinic-time.js';
import appConfig from '../../../config/app.config.js';
import { CryptoService } from '../../../security/crypto.service.js';
import { AppointmentsRepository } from '../../appointments/appointments.repository.js';
import type { Appointment } from '../../appointments/entities/appointment.entity.js';
import { ProfessionalsRepository } from '../../professionals/professionals.repository.js';
import { IntegrationsRepository } from '../integrations.repository.js';
import {
  GoogleApiError,
  GoogleCalendarClient,
  type GoogleEventInput,
} from './google-calendar.client.js';

interface StoredCredentials {
  refreshToken: string;
  accountEmail?: string;
}

const STATE_TTL_MS = 10 * 60 * 1000;
/** Estados de consulta que ocupam a agenda. */
const SYNCED_STATUSES = ['AGENDADA', 'CONFIRMADA', 'CONCLUIDA'];

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly credentialsCrypto;
  private readonly stateSigner;
  private readonly accessTokens = new Map<
    string,
    { token: string; expiresAt: number }
  >();

  constructor(
    private readonly client: GoogleCalendarClient,
    private readonly integrations: IntegrationsRepository,
    private readonly appointments: AppointmentsRepository,
    private readonly professionals: ProfessionalsRepository,
    private readonly events: EventEmitter2,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
    crypto: CryptoService,
  ) {
    this.credentialsCrypto = crypto.forField('integration:google');
    this.stateSigner = crypto.forField('integration:google-state');
  }

  // ---------------------------------------------------------------- conexão

  async status(clinicId: string) {
    const row = await this.integrations.find(clinicId, 'GOOGLE_CALENDAR');
    const credentials = this.readCredentials(row?.credentials ?? null);
    const [pending] = await this.dataSource.query<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM appointments WHERE "clinicId" = $1 AND "googleSyncState" = 'PENDING'`,
      [clinicId],
    );
    return {
      configured: this.client.configured,
      status: row?.status ?? 'DISCONNECTED',
      accountEmail: credentials?.accountEmail ?? null,
      connectedAt: row?.connectedAt ?? null,
      pendingSync: pending.n,
    };
  }

  /** URL do Google para o ADMIN autorizar; `state` assinado liga a volta à clínica e ao usuário. */
  authUrl(clinicId: string, userId: string) {
    if (!this.client.configured) {
      throw new ConflictException(
        'A integração com o Google não está configurada no servidor (credenciais ausentes).',
      );
    }
    const payload = Buffer.from(
      JSON.stringify({ c: clinicId, u: userId, e: Date.now() + STATE_TTL_MS }),
    ).toString('base64url');
    return {
      url: this.client.authUrl(`${payload}.${this.stateSigner.hash(payload)}`),
    };
  }

  /** Volta do Google: valida o `state`, troca o código e guarda o refresh token cifrado. */
  async handleCallback(code: string, state: string) {
    const [payload, signature] = state.split('.');
    if (
      !payload ||
      !signature ||
      this.stateSigner.hash(payload) !== signature
    ) {
      throw new BadRequestException('Retorno do Google inválido.');
    }
    const { c: clinicId, e: expires } = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { c: string; u: string; e: number };
    if (Date.now() > expires) {
      throw new BadRequestException(
        'A autorização expirou. Tente conectar de novo.',
      );
    }

    const tokens = await this.client.exchangeCode(code);
    if (!tokens.refreshToken) {
      throw new BadRequestException(
        'O Google não devolveu a autorização permanente. Remova o acesso do app na sua conta Google e conecte de novo.',
      );
    }
    await this.integrations.save(clinicId, 'GOOGLE_CALENDAR', {
      status: 'CONNECTED',
      credentials: this.credentialsCrypto.encrypt(
        JSON.stringify({
          refreshToken: tokens.refreshToken,
          accountEmail: tokens.email,
        } satisfies StoredCredentials),
      ),
      connectedAt: new Date(),
    });
    this.accessTokens.set(clinicId, {
      token: tokens.accessToken,
      expiresAt: Date.now() + (tokens.expiresIn - 60) * 1000,
    });
    return clinicId;
  }

  async disconnect(clinicId: string) {
    const row = await this.integrations.find(clinicId, 'GOOGLE_CALENDAR');
    const credentials = this.readCredentials(row?.credentials ?? null);
    if (credentials) await this.client.revoke(credentials.refreshToken);
    this.accessTokens.delete(clinicId);
    await this.integrations.save(clinicId, 'GOOGLE_CALENDAR', {
      status: 'DISCONNECTED',
      credentials: null,
      connectedAt: null,
    });
    // As agendas e eventos já criados continuam no Google; só deixam de ser atualizados.
    await this.dataSource.query(
      `UPDATE appointments SET "googleSyncState" = NULL WHERE "clinicId" = $1 AND "googleSyncState" = 'PENDING'`,
      [clinicId],
    );
  }

  // ------------------------------------------------------------ agendas

  /** Profissionais da clínica com a situação da agenda no Google. */
  async professionalsOverview(clinicId: string) {
    const list = await this.professionals.findByClinic(clinicId);
    return list.map((p) => ({
      professionalId: p.id,
      name: p.user?.name ?? null,
      active: p.active,
      hasCalendar: !!p.googleCalendarId,
    }));
  }

  /** Cria a agenda do profissional agora (ou devolve a existente). */
  async createProfessionalCalendar(clinicId: string, professionalId: string) {
    const professional = await this.professionals.findById(
      clinicId,
      professionalId,
    );
    if (!professional)
      throw new NotFoundException('Profissional não encontrado!');
    const accessToken = await this.accessToken(clinicId);
    return {
      calendarId: await this.ensureCalendar(
        clinicId,
        professional,
        accessToken,
      ),
    };
  }

  // ------------------------------------------------------- sincronização

  /** Marca a consulta como pendente e tenta enviar já; se falhar, o job tenta de novo. */
  async requestSync(clinicId: string, appointmentId: string) {
    if (!(await this.isConnected(clinicId))) return;
    await this.appointments.update(appointmentId, {
      googleSyncState: 'PENDING',
    });
    await this.trySync(appointmentId);
  }

  /** Primeira conexão: envia as consultas futuras em aberto. */
  async syncAllFuture(clinicId: string) {
    if (!(await this.isConnected(clinicId))) {
      throw new ConflictException('O Google Agenda não está conectado!');
    }
    await this.appointments.markFutureForGoogleSync(clinicId);
    return this.processPending(500, clinicId);
  }

  /** Processa pendências (job a cada 10 min, ou uma clínica só). */
  async processPending(limit = 50, onlyClinicId?: string) {
    const pending = (
      await this.appointments.findPendingGoogleSync(limit)
    ).filter((a) => !onlyClinicId || a.clinicId === onlyClinicId);
    let done = 0;
    for (const { id } of pending) {
      if (await this.trySync(id)) done++;
    }
    return { processed: pending.length, synced: done };
  }

  private async trySync(appointmentId: string) {
    try {
      await this.sync(appointmentId);
      return true;
    } catch (error) {
      this.logger.warn(
        `Sincronização da consulta ${appointmentId} falhou: ${String(error)}`,
      );
      // Atualiza a linha para ela ir ao fim da fila e não travar as demais.
      await this.appointments.update(appointmentId, {
        googleSyncState: 'PENDING',
      });
      return false;
    }
  }

  private async sync(appointmentId: string) {
    const appointment = await this.appointments.findDetailed(appointmentId);
    if (!appointment) return;
    const { clinicId } = appointment;

    if (!(await this.isConnected(clinicId))) {
      await this.appointments.update(appointmentId, { googleSyncState: null });
      return;
    }
    const accessToken = await this.accessToken(clinicId);
    const professional = appointment.professional;

    // Cancelada/falta/sem vaga na agenda: remove o evento, se existir.
    if (!SYNCED_STATUSES.includes(appointment.status)) {
      if (appointment.googleEventId && professional.googleCalendarId) {
        await this.client.deleteEvent(
          accessToken,
          professional.googleCalendarId,
          appointment.googleEventId,
        );
      }
      await this.appointments.update(appointmentId, {
        googleEventId: null,
        googleSyncState: 'SYNCED',
      });
      return;
    }

    const event = this.toEvent(appointment);
    let calendarId = await this.ensureCalendar(
      clinicId,
      professional,
      accessToken,
    );
    let eventId: string;

    const upsert = async () => {
      if (appointment.googleEventId) {
        try {
          return (
            await this.client.patchEvent(
              accessToken,
              calendarId,
              appointment.googleEventId,
              event,
            )
          ).id;
        } catch (error) {
          if (!(error instanceof GoogleApiError && error.isNotFound))
            throw error;
        }
      }
      return (await this.client.insertEvent(accessToken, calendarId, event)).id;
    };

    try {
      eventId = await upsert();
    } catch (error) {
      // Agenda apagada no Google: recria e tenta uma vez mais.
      if (!(error instanceof GoogleApiError && error.isNotFound)) throw error;
      await this.professionals.update(professional.id, {
        googleCalendarId: null,
      });
      calendarId = await this.ensureCalendar(
        clinicId,
        {
          id: professional.id,
          googleCalendarId: null,
          user: professional.user,
        },
        accessToken,
      );
      appointment.googleEventId = null;
      eventId = await upsert();
    }

    await this.appointments.update(appointmentId, {
      googleEventId: eventId,
      googleSyncState: 'SYNCED',
    });
  }

  private toEvent(a: Appointment): GoogleEventInput {
    // Sem dados clínicos: só quem, com quem, onde e a situação.
    return {
      summary: `Consulta — ${a.patient.name}`,
      description: [
        `Profissional: ${a.professional.user?.name ?? '-'}`,
        `Clínica: ${a.clinic.name}`,
        `Situação: ${a.status}`,
      ].join('\n'),
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      timeZone: CLINIC_TZ,
    };
  }

  private async ensureCalendar(
    clinicId: string,
    professional: {
      id: string;
      googleCalendarId: string | null;
      user?: { name: string } | null;
    },
    accessToken: string,
  ) {
    if (professional.googleCalendarId) return professional.googleCalendarId;
    const created = await this.client.createCalendar(
      accessToken,
      `Vivace — ${professional.user?.name ?? 'Profissional'}`,
      CLINIC_TZ,
    );
    await this.professionals.update(professional.id, {
      googleCalendarId: created.id,
    });
    this.logger.log(
      `Agenda criada para o profissional ${professional.id} (clínica ${clinicId})`,
    );
    return created.id;
  }

  // ------------------------------------------------------------- tokens

  private async isConnected(clinicId: string) {
    const row = await this.integrations.find(clinicId, 'GOOGLE_CALENDAR');
    return row?.status === 'CONNECTED';
  }

  private readCredentials(encrypted: string | null) {
    if (!encrypted) return null;
    return JSON.parse(
      this.credentialsCrypto.decrypt(encrypted),
    ) as StoredCredentials;
  }

  /** Access token em cache; renova com o refresh token e desconecta se o Google recusar. */
  private async accessToken(clinicId: string) {
    const cached = this.accessTokens.get(clinicId);
    if (cached && cached.expiresAt > Date.now()) return cached.token;

    const row = await this.integrations.find(clinicId, 'GOOGLE_CALENDAR');
    const credentials = this.readCredentials(row?.credentials ?? null);
    if (!credentials || row?.status !== 'CONNECTED') {
      throw new ConflictException('O Google Agenda não está conectado!');
    }
    try {
      const { accessToken, expiresIn } = await this.client.refresh(
        credentials.refreshToken,
      );
      this.accessTokens.set(clinicId, {
        token: accessToken,
        expiresAt: Date.now() + (expiresIn - 60) * 1000,
      });
      return accessToken;
    } catch (error) {
      if (error instanceof GoogleApiError && error.isInvalidGrant) {
        await this.markDisconnected(
          clinicId,
          'A autorização do Google expirou ou foi revogada.',
        );
      }
      throw error;
    }
  }

  private async markDisconnected(clinicId: string, reason: string) {
    this.accessTokens.delete(clinicId);
    await this.integrations.save(clinicId, 'GOOGLE_CALENDAR', {
      status: 'DISCONNECTED',
      credentials: null,
      connectedAt: null,
    });
    const event: IntegrationDisconnectedEvent = {
      clinicId,
      provider: 'GOOGLE_CALENDAR',
      reason,
    };
    await this.events.emitAsync(INTEGRATION_DISCONNECTED, event);
  }
}
