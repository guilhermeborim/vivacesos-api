import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CLINIC_RECURRING_ENABLED,
  type ClinicRecurringEnabledEvent,
} from '../../common/events/domain.events.js';
import { SettingsRepository } from './settings.repository.js';
import type { UpdateSettingsDto } from './schemas/settings.schema.js';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly events: EventEmitter2,
  ) {}

  async get(clinicId: string) {
    return {
      recurringExpensesEnabled:
        await this.settings.isRecurringEnabled(clinicId),
    };
  }

  async update(clinicId: string, input: UpdateSettingsDto) {
    const wasEnabled = await this.settings.isRecurringEnabled(clinicId);
    if (input.recurringExpensesEnabled !== undefined) {
      await this.settings.setRecurringEnabled(
        clinicId,
        input.recurringExpensesEnabled,
      );
      // Religar não gera as ocorrências do período desligado (quem escuta pula as perdidas).
      if (input.recurringExpensesEnabled && !wasEnabled) {
        const event: ClinicRecurringEnabledEvent = { clinicId };
        await this.events.emitAsync(CLINIC_RECURRING_ENABLED, event);
      }
    }
    return this.get(clinicId);
  }
}
