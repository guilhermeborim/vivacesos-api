import { Inject, Injectable } from '@nestjs/common';
import {
  PATIENT_MESSAGE_CHANNEL,
  type PatientMessageChannel,
} from './channels/patient-message-channel.js';
import { IntegrationsRepository } from './integrations.repository.js';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly integrations: IntegrationsRepository,
    @Inject(PATIENT_MESSAGE_CHANNEL)
    private readonly channel: PatientMessageChannel,
  ) {}

  /** Sem linha = desconectada. Credenciais nunca saem da API. */
  async status(clinicId: string) {
    const rows = await this.integrations.findByClinic(clinicId);
    const of = (provider: 'GOOGLE_CALENDAR' | 'WHATSAPP') => {
      const row = rows.find((r) => r.provider === provider);
      return {
        provider,
        status: row?.status ?? 'DISCONNECTED',
        connectedAt: row?.connectedAt ?? null,
      };
    };
    return {
      googleCalendar: of('GOOGLE_CALENDAR'),
      whatsapp: {
        ...of('WHATSAPP'),
        // Hoje o canal é manual; com a Z-API conectada passa a ser automático.
        automaticSending: this.channel.automatic,
        manualSending: true,
      },
    };
  }
}
