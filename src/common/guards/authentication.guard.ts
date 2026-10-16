import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../../security/token.service.js';
import { JwtErrorType } from '../enums/jwt-error-type.enum.js';
import { readCookie } from '../utils/read-cookie.js';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';
import { USER_LOOKUP, type UserLookup } from '../tokens/lookups.js';

const jwtError = (message: string, errorType: JwtErrorType) =>
  new UnauthorizedException({ message, errorType, code: 'JWT_ERROR' });

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    @Inject(USER_LOOKUP) private readonly users: UserLookup,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(request, 'token');

    if (!token) {
      throw jwtError('Token não fornecido', JwtErrorType.TOKEN_NOT_PROVIDED);
    }

    const payload = await this.tokenService.verifyAccessToken(token);
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw jwtError('Usuário não encontrado', JwtErrorType.USER_NOT_FOUND);
    }

    request.user = user;
    request.clinicId = payload.clinicId;
    return true;
  }
}
