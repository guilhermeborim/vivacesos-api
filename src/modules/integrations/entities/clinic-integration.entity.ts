import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type IntegrationProvider = 'GOOGLE_CALENDAR' | 'WHATSAPP';
export type IntegrationStatus = 'DISCONNECTED' | 'PENDING' | 'CONNECTED';

/**
 * Integração externa da clínica (Google Agenda, WhatsApp). Uma linha por clínica e provedor.
 * `credentials` guarda um JSON cifrado (tokens, instância…); `config` guarda opções não sensíveis.
 */
@Entity('clinic_integrations')
export class ClinicIntegration {
  @PrimaryColumn({ name: 'clinicId', type: 'uuid' })
  clinicId: string;

  @PrimaryColumn({
    name: 'provider',
    type: 'enum',
    enum: ['GOOGLE_CALENDAR', 'WHATSAPP'],
    enumName: 'integration_provider_enum',
  })
  provider: IntegrationProvider;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['DISCONNECTED', 'PENDING', 'CONNECTED'],
    enumName: 'integration_status_enum',
    default: 'DISCONNECTED',
  })
  status: IntegrationStatus;

  @Column({ name: 'credentials', type: 'text', nullable: true })
  credentials: string | null;

  @Column({ name: 'config', type: 'jsonb', nullable: true })
  config: Record<string, unknown> | null;

  @Column({ name: 'connectedAt', type: 'timestamptz', nullable: true })
  connectedAt: Date | null;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz', nullable: false })
  updatedAt: Date;
}
