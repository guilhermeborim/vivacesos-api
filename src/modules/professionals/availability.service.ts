import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { hoursToRanges, rangesToDays } from './availability.js';
import { AvailabilityRepository } from './availability.repository.js';
import { ProfessionalsRepository } from './professionals.repository.js';
import type { UpdateAvailabilityDto } from './schemas/availability.schema.js';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly availability: AvailabilityRepository,
    private readonly professionals: ProfessionalsRepository,
  ) {}

  async get(clinicId: string, professionalId: string) {
    const professional = await this.getOrFail(clinicId, professionalId);
    return {
      professionalId: professional.id,
      restricted: professional.availabilityRestricted,
      days: rangesToDays(await this.availability.findRanges(professional.id)),
    };
  }

  /** O próprio profissional ou o ADMIN. */
  async update(
    clinicId: string,
    requester: { id: string; role: ClinicUserRole | undefined },
    professionalId: string,
    input: UpdateAvailabilityDto,
  ) {
    const professional = await this.getOrFail(clinicId, professionalId);
    const isAdmin = requester.role === ClinicUserRole.ADMIN;
    if (!isAdmin && professional.userId !== requester.id) {
      throw new ForbiddenException(
        'Somente o próprio profissional ou o ADMIN altera os horários de atendimento.',
      );
    }
    await this.availability.replace(
      professional.id,
      input.restricted,
      hoursToRanges(input.days),
    );
    return this.get(clinicId, professionalId);
  }

  private async getOrFail(clinicId: string, id: string) {
    const professional = await this.professionals.findById(clinicId, id);
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado!');
    }
    return professional;
  }
}
