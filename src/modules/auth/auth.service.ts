import { PasswordHasher } from '@nestjs/authentication';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { INVITE_ACCEPTED } from '../../common/events/domain.events.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClinicUsersRepository } from '../clinic-users/clinic-users.repository.js';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { ClinicUserStatus } from '../../common/enums/clinic-user-status.enum.js';
import { ROLE_PERMISSIONS } from '../../common/permissions/role-permissions.js';
import { InvitesRepository } from '../invites/invites.repository.js';
import { ProfessionalsService } from '../professionals/professionals.service.js';
import { RefreshTokensRepository } from '../refresh-tokens/refresh-tokens.repository.js';
import { TokenService } from '../../security/token.service.js';
import { UserOnboardingStep } from '../users/enums/user-onboarding-step.enum.js';
import { UsersRepository } from '../users/users.repository.js';
import type { LoginDto } from './schemas/login.schema.js';
import type { RegisterDto } from './schemas/register.schema.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly clinicUsers: ClinicUsersRepository,
    private readonly invites: InvitesRepository,
    private readonly professionals: ProfessionalsService,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly tokens: TokenService,
    private readonly passwordHasher: PasswordHasher,
    private readonly events: EventEmitter2,
  ) {}

  async register(input: RegisterDto) {
    if (await this.users.findByEmail(input.email)) {
      throw new ConflictException('E-mail já está cadastrado!');
    }

    const { inviteToken, professional, ...data } = input;
    const found = await this.invites.findByEmail(data.email);
    const invite = found && !found.accepted ? found : null;

    if (invite) {
      // O e-mail tem convite pendente: só entra na clínica quem comprova o token do convite.
      if (inviteToken !== invite.token) {
        throw new ForbiddenException(
          'Este e-mail possui um convite pendente. Use o link do convite para se cadastrar!',
        );
      }
      if (invite.expiresAt < new Date()) {
        throw new ForbiddenException('Convite expirado, solicite outro!');
      }
      if (invite.role === ClinicUserRole.PROFISSIONAL && !professional) {
        throw new BadRequestException(
          'Informe o CRM e a especialidade para concluir o cadastro de profissional!',
        );
      }
    }

    // Convites de PROFISSIONAL (e de ADMIN que também atende) já criam o perfil de profissional.
    const professionalInput =
      invite &&
      professional &&
      (invite.role === ClinicUserRole.PROFISSIONAL ||
        invite.role === ClinicUserRole.ADMIN)
        ? professional
        : null;
    if (invite && professionalInput) {
      // Valida antes de criar o usuário, para não deixar usuário sem perfil se o CRM for recusado.
      await this.professionals.assertCrmAvailable(
        invite.clinicId,
        professionalInput.crm,
      );
    }

    const user = await this.users.create(
      { ...data, password: await this.passwordHasher.hash(data.password) },
      invite ? UserOnboardingStep.FINISHED : undefined,
    );

    if (invite) {
      await this.clinicUsers.bind({
        userId: user.id,
        clinicId: invite.clinicId,
        role: invite.role,
        status: ClinicUserStatus.ATIVO,
      });
      await this.invites.markAccepted(invite.id);
      await this.events.emitAsync(INVITE_ACCEPTED, {
        clinicId: invite.clinicId,
        userName: user.name,
        email: user.email,
      });
      if (professionalInput) {
        await this.professionals.registerForInvitedUser(
          invite.clinicId,
          user.id,
          professionalInput,
        );
      }
    }
  }

  async login({ email, password }: LoginDto) {
    const user = await this.users.findByEmail(email);

    // verify() com hash indefinido gasta o mesmo tempo, sem revelar se o e-mail existe.
    if (
      !(await this.passwordHasher.verify(password, user?.password)) ||
      !user
    ) {
      throw new UnauthorizedException('E-mail ou senha inválidos!');
    }

    const clinics = await this.clinicUsers.getClinicsByUser(user.id);
    if (
      clinics.length > 0 &&
      !clinics.some((c) => c.status === ClinicUserStatus.ATIVO)
    ) {
      throw new ForbiddenException(
        'Este usuário não possui clínicas ATIVAS. Entre em contato com o Administrador!',
      );
    }

    // Com uma única clínica ela já é a ativa; com várias, o usuário escolhe depois.
    const clinicId = clinics.length === 1 ? clinics[0].clinicId : undefined;

    await this.refreshTokens.revokeAllByUser(user.id);
    const { accessToken, refresh } = await this.tokens.generateTokenPair({
      sub: user.id,
      clinicId,
    });
    await this.refreshTokens.create({
      userId: user.id,
      clinicId: clinicId ?? null,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
    });

    return { accessToken, refreshToken: refresh.token };
  }

  async refresh(refreshToken: string) {
    const stored = await this.refreshTokens.findActiveByHash(
      this.tokens.hashRefreshToken(refreshToken),
    );

    if (!stored) throw new UnauthorizedException('Token inválido!');

    if (this.tokens.isRefreshTokenExpired(stored.expiresAt)) {
      await this.refreshTokens.deleteExpired();
      throw new UnauthorizedException('Token expirado!');
    }

    return {
      accessToken: await this.tokens.generateAccessToken({
        sub: stored.userId,
        clinicId: stored.clinicId ?? undefined,
      }),
    };
  }

  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      await this.refreshTokens.deleteByHash(
        this.tokens.hashRefreshToken(refreshToken),
      );
    }
  }

  async session(userId: string, clinicId: string | undefined) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado!');

    const clinicUsers = await this.clinicUsers.getClinicsByUser(userId);
    const clinics = clinicUsers.map((cu) => ({
      clinicId: cu.clinicId,
      name: cu.clinic.name,
    }));

    let active = clinicUsers.length === 1 ? clinicUsers[0] : undefined;
    if (clinicId) {
      active = clinicUsers.find((cu) => cu.clinicId === clinicId);
      if (!active)
        throw new ForbiddenException('Usuário não vinculado à clínica!');
    }

    const role = active?.role ?? null;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboardingStep: user.onboardingStep,
      },
      clinics,
      activeClinic: active
        ? { clinicId: active.clinicId, name: active.clinic.name }
        : null,
      role,
      permissions: role ? ROLE_PERMISSIONS[role] : null,
    };
  }

  /** Emite novo access token para a clínica escolhida e a grava no refresh token. */
  async selectClinic(
    userId: string,
    clinicId: string,
    refreshToken: string | undefined,
  ) {
    const clinicUser = await this.clinicUsers.getUserBindedClinic(
      clinicId,
      userId,
    );
    if (!clinicUser)
      throw new ForbiddenException('Usuário não vinculado à clínica!');

    // Sem isso, o próximo /refresh voltaria a emitir token sem clínica.
    if (refreshToken) {
      await this.refreshTokens.updateClinicByHash(
        this.tokens.hashRefreshToken(refreshToken),
        clinicId,
      );
    }

    return {
      accessToken: await this.tokens.generateAccessToken({
        sub: userId,
        clinicId,
      }),
    };
  }

  async nextOnboardingStep(userId: string, step: UserOnboardingStep) {
    if (!(await this.users.findById(userId))) {
      throw new NotFoundException('Usuário não encontrado!');
    }
    await this.users.updateOnboardingStep(userId, step);
    return { nextOnboardingStep: step };
  }
}
