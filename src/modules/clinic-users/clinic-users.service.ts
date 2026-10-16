import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { ClinicUserStatus } from '../../common/enums/clinic-user-status.enum.js';
import {
  CLINIC_USER_STATUS_CHANGED,
  ClinicUserStatusChangedEvent,
} from './events/clinic-user-status-changed.event.js';
import { UsersRepository } from '../users/users.repository.js';
import { ClinicUsersRepository } from './clinic-users.repository.js';
import type { BindClinicUserDto } from './schemas/bind-clinic-user.schema.js';
import { ALLOWED_TRANSITIONS } from './schemas/update-status.schema.js';
import type { UpdateUserDto } from './schemas/update-user.schema.js';

@Injectable()
export class ClinicUsersService {
  constructor(
    private readonly clinicUsers: ClinicUsersRepository,
    private readonly users: UsersRepository,
    private readonly events: EventEmitter2,
  ) {}

  async bind(clinicId: string, input: BindClinicUserDto) {
    if (!(await this.users.findById(input.userId))) {
      throw new NotFoundException('Usuário não encontrado!');
    }
    if (await this.clinicUsers.getUserBindedClinic(clinicId, input.userId)) {
      throw new ConflictException('Usuário já está vinculado a clínica!');
    }

    const bound = await this.clinicUsers.bind({
      clinicId,
      userId: input.userId,
      role: input.role,
      status: input.status ?? ClinicUserStatus.ATIVO,
    });

    return {
      clinicId: bound.clinicId,
      userId: bound.userId,
      role: bound.role,
      status: bound.status,
    };
  }

  findByClinic(clinicId: string) {
    return this.clinicUsers.getUsersByClinic(clinicId);
  }

  async findOne(clinicId: string, userId: string) {
    const clinicUser = await this.clinicUsers.getUserBindedClinic(
      clinicId,
      userId,
    );
    if (!clinicUser) {
      throw new NotFoundException(
        'Vínculo do usuário com a clínica não encontrado!',
      );
    }

    const { id, name, email } = clinicUser.user;
    return {
      clinicUserId: clinicUser.id,
      role: clinicUser.role,
      status: clinicUser.status,
      user: { userId: id, name, email },
    };
  }

  /** O próprio usuário edita o nome; `active` (global) e terceiros só ADMIN. */
  async updateUser(
    clinicId: string,
    requester: { id: string; role: ClinicUserRole | undefined },
    targetUserId: string,
    data: UpdateUserDto,
  ) {
    const isAdmin = requester.role === ClinicUserRole.ADMIN;
    const isSelf = requester.id === targetUserId;

    if (!isAdmin && !(isSelf && data.active === undefined)) {
      throw new ForbiddenException(
        'Usuário não possui permissão para alterar este usuário.',
      );
    }
    if (!(await this.clinicUsers.getUserBindedClinic(clinicId, targetUserId))) {
      throw new NotFoundException('Usuário não encontrado nesta clínica!');
    }

    await this.users.update(targetUserId, data);
  }

  async updateStatus(
    clinicId: string,
    requestingUserId: string,
    targetUserId: string,
    newStatus: ClinicUserStatus,
  ) {
    if (requestingUserId === targetUserId) {
      throw new ForbiddenException(
        'Você não pode alterar o seu próprio status!',
      );
    }

    const clinicUser = await this.clinicUsers.getUserBindedClinic(
      clinicId,
      targetUserId,
    );
    if (!clinicUser) {
      throw new NotFoundException('Usuário não encontrado nesta clínica!');
    }

    if (!ALLOWED_TRANSITIONS[clinicUser.status].includes(newStatus)) {
      throw new ForbiddenException(
        `Transição de status inválida: ${clinicUser.status} → ${newStatus}`,
      );
    }

    await this.clinicUsers.updateStatus(clinicId, targetUserId, newStatus);
    await this.events.emitAsync(
      CLINIC_USER_STATUS_CHANGED,
      new ClinicUserStatusChangedEvent(
        clinicId,
        targetUserId,
        clinicUser.role,
        newStatus,
      ),
    );
  }
}
