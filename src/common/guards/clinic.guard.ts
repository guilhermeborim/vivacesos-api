import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ClinicUserStatus } from '../enums/clinic-user-status.enum.js';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';
import {
  CLINIC_USER_LOOKUP,
  type ClinicUserLookup,
} from '../tokens/lookups.js';

const BLOCKED_MESSAGES: Partial<Record<ClinicUserStatus, string>> = {
  [ClinicUserStatus.INATIVO]:
    'Usuário INATIVADO para acessar esta clínica. Contate o ADMINISTRADOR!',
  [ClinicUserStatus.BLOQUEADO]:
    'Usuário BLOQUEADO para acessar esta clínica. Contate o ADMINISTRADOR!',
  [ClinicUserStatus.INVITADO]:
    'Usuário ainda não aceitou o convite para acessar esta clínica. Verifique seu E-mail!',
};

/** Deve rodar depois do AuthenticationGuard. */
@Injectable()
export class ClinicGuard implements CanActivate {
  constructor(
    @Inject(CLINIC_USER_LOOKUP) private readonly clinicUsers: ClinicUserLookup,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.clinicId) {
      throw new UnauthorizedException('Clínica não selecionada no token');
    }

    const clinicUser = await this.clinicUsers.getUserBindedClinic(
      request.clinicId,
      request.user.id,
    );

    if (!clinicUser) {
      throw new UnauthorizedException(
        'Usuário não autorizado para acessar esta clínica!',
      );
    }

    const blocked = BLOCKED_MESSAGES[clinicUser.status];
    if (blocked) throw new UnauthorizedException(blocked);

    request.userRole = clinicUser.role;
    return true;
  }
}
