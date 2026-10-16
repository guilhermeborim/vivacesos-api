import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicSettings } from './entities/clinic-settings.entity.js';

/** Opções por clínica; clínica sem linha usa os padrões (tudo desligado). */
@Injectable()
export class SettingsRepository {
  constructor(
    @InjectRepository(ClinicSettings)
    private readonly repository: Repository<ClinicSettings>,
  ) {}

  async isRecurringEnabled(clinicId: string) {
    const settings = await this.repository.findOne({ where: { clinicId } });
    return settings?.recurringExpensesEnabled ?? false;
  }

  async setRecurringEnabled(clinicId: string, enabled: boolean) {
    await this.repository.query(
      `INSERT INTO clinic_settings ("clinicId", "recurringExpensesEnabled")
       VALUES ($1, $2)
       ON CONFLICT ("clinicId")
       DO UPDATE SET "recurringExpensesEnabled" = EXCLUDED."recurringExpensesEnabled", "updatedAt" = now()`,
      [clinicId, enabled],
    );
  }
}
