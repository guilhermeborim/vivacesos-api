import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PAYOUT_LAUNCHED } from '../../common/events/domain.events.js';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { ProfessionalsRepository } from '../professionals/professionals.repository.js';
import { PayoutsRepository } from './payouts.repository.js';
import type {
  CreatePayoutDto,
  ListPayoutsDto,
  PayoutPreviewDto,
} from './schemas/finance.schema.js';

export interface PayoutActor {
  userId: string;
  role?: ClinicUserRole;
}

const SAO_PAULO = 'America/Sao_Paulo';

const todayIso = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: SAO_PAULO }).format(new Date());

const formatDate = (date: Date) =>
  date.toLocaleDateString('pt-BR', { timeZone: SAO_PAULO });

@Injectable()
export class PayoutsService {
  constructor(
    private readonly payouts: PayoutsRepository,
    private readonly professionals: ProfessionalsRepository,
    private readonly events: EventEmitter2,
  ) {}

  /** Quanto seria repassado agora: consultas pagas e ainda não repassadas. */
  async preview(clinicId: string, input: PayoutPreviewDto) {
    const professional = await this.getProfessionalOrFail(
      clinicId,
      input.professionalId,
    );
    const cutoffAt = input.cutoffAt ? new Date(input.cutoffAt) : new Date();
    const eligible = await this.payouts.eligible(
      clinicId,
      professional.id,
      cutoffAt,
    );
    const percent = input.percent ?? professional.payoutPercent;

    return {
      professionalId: professional.id,
      cutoffAt,
      percent,
      eligibleCount: eligible.count,
      grossAmount: eligible.grossCents / 100,
      amount:
        percent === null
          ? null
          : Math.round((eligible.grossCents * percent) / 100) / 100,
    };
  }

  async create(clinicId: string, actor: PayoutActor, input: CreatePayoutDto) {
    const professional = await this.getProfessionalOrFail(
      clinicId,
      input.professionalId,
    );
    const percent = input.percent ?? professional.payoutPercent;
    if (!percent || percent <= 0) {
      throw new BadRequestException(
        'Informe o percentual do repasse ou cadastre-o no profissional!',
      );
    }
    const cutoffAt = input.cutoffAt ? new Date(input.cutoffAt) : new Date();
    const name = professional.user?.name ?? 'Profissional';

    const launched = await this.payouts.launch({
      clinicId,
      professionalId: professional.id,
      percent,
      cutoffAt,
      dueDate: input.dueDate ?? todayIso(),
      description: `Repasse — ${name} (pagamentos até ${formatDate(cutoffAt)})`,
      createdBy: actor.userId,
    });
    await this.events.emitAsync(PAYOUT_LAUNCHED, {
      clinicId,
      payoutId: launched.payoutId,
      professionalUserId: professional.userId,
      professionalName: name,
      amount: launched.amount,
      actorUserId: actor.userId,
    });
    return launched;
  }

  /** O PROFISSIONAL só enxerga os próprios repasses; os demais papéis filtram livremente. */
  async list(clinicId: string, actor: PayoutActor, filters: ListPayoutsDto) {
    let professionalId = filters.professionalId;
    if (actor.role === ClinicUserRole.PROFISSIONAL) {
      const own = await this.professionals.findByUser(clinicId, actor.userId);
      if (!own) throw new ForbiddenException('Profissional não encontrado!');
      professionalId = own.id;
    }
    return this.payouts.list(clinicId, { professionalId, paid: filters.paid });
  }

  async undo(clinicId: string, payoutId: string) {
    const result = await this.payouts.undo(clinicId, payoutId);
    if (result === null) throw new NotFoundException('Repasse não encontrado!');
  }

  private async getProfessionalOrFail(clinicId: string, id: string) {
    const professional = await this.professionals.findById(clinicId, id);
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado!');
    }
    return professional;
  }
}
