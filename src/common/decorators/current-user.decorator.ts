import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';

/** Usuário autenticado (definido pelo AuthenticationGuard). */
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

/** Clínica ativa no access token, se houver. */
export const CurrentClinicId = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().clinicId,
);

/** Papel do usuário na clínica ativa (definido pelo ClinicGuard). */
export const CurrentUserRole = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().userRole,
);
