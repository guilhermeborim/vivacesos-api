import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';
import {
  type Permission,
  ROLE_PERMISSIONS,
} from '../permissions/role-permissions.js';

/** Deve rodar depois do ClinicGuard (que define `userRole`). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const { userRole } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    const granted = userRole ? ROLE_PERMISSIONS[userRole] : [];

    if (!required.every((p) => granted.includes(p))) {
      throw new ForbiddenException(
        'Usuário não possui permissão para acessar este recurso.',
      );
    }
    return true;
  }
}
