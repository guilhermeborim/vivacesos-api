import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentClinicId,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator.js';
import { AuthenticationGuard } from '../../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../../common/guards/clinic.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { PERMISSIONS } from '../../../common/permissions/role-permissions.js';
import appConfig from '../../../config/app.config.js';
import { GoogleCalendarService } from './google-calendar.service.js';

@ApiTags('integrations')
@Controller('clinic/integrations/google')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.INTEGRATIONS_MANAGE)
export class GoogleCalendarController {
  constructor(private readonly google: GoogleCalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Situação da conexão com o Google Agenda' })
  status(@CurrentClinicId() clinicId: string) {
    return this.google.status(clinicId);
  }

  @Get('auth-url')
  @ApiOperation({ summary: 'URL para o ADMIN autorizar o Google' })
  authUrl(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.google.authUrl(clinicId, user.id);
  }

  @Post('disconnect')
  @HttpCode(204)
  @ApiOperation({ summary: 'Desconecta o Google Agenda (revoga o acesso)' })
  async disconnect(@CurrentClinicId() clinicId: string) {
    await this.google.disconnect(clinicId);
  }

  @Post('sync-all')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Envia as consultas futuras em aberto para o Google',
  })
  syncAll(@CurrentClinicId() clinicId: string) {
    return this.google.syncAllFuture(clinicId);
  }

  @Get('professionals')
  @ApiOperation({ summary: 'Profissionais e situação da agenda de cada um' })
  professionals(@CurrentClinicId() clinicId: string) {
    return this.google.professionalsOverview(clinicId);
  }

  @Post('professionals/:professionalId/calendar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cria a agenda do profissional no Google' })
  createCalendar(
    @CurrentClinicId() clinicId: string,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ) {
    return this.google.createProfessionalCalendar(clinicId, professionalId);
  }
}

/** Retorno do Google (navegação do usuário): sem cookie, validado pelo `state` assinado. */
@ApiTags('integrations')
@Controller('integrations/google')
export class GoogleCallbackController {
  constructor(
    private readonly google: GoogleCalendarService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  @Get('callback')
  @Redirect()
  @ApiOperation({ summary: 'Retorno do OAuth do Google' })
  async callback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ) {
    const back = (query: string) => ({
      url: `${this.config.appUrl}/google?${query}`,
    });
    if (error || !code || !state) return back('error=denied');
    try {
      await this.google.handleCallback(code, state);
      return back('connected=1');
    } catch {
      return back('error=failed');
    }
  }
}
