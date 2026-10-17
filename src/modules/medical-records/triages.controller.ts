import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentClinicId,
  CurrentUser,
  CurrentUserRole,
} from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import type { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { PERMISSIONS } from '../../common/permissions/role-permissions.js';
import { type TriageDto, triageSchema } from './schemas/triage.schema.js';
import { TriagesService } from './triages.service.js';

@ApiTags('medical-records')
@Controller('clinic/medical-records/appointments/:appointmentId/triage')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.TRIAGE_MANAGE)
export class TriagesController {
  constructor(private readonly triages: TriagesService) {}

  @Get()
  @ApiOperation({ summary: 'Triagem da consulta (sinais vitais)' })
  get(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @CurrentUserRole() role: ClinicUserRole,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.triages.get(clinicId, { id: user.id, role }, appointmentId);
  }

  @Put()
  @ApiOperation({ summary: 'Registra a triagem da consulta (valor atual)' })
  save(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @CurrentUserRole() role: ClinicUserRole,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body({ schema: triageSchema }) body: TriageDto,
  ) {
    return this.triages.save(
      clinicId,
      { id: user.id, role },
      appointmentId,
      body,
    );
  }
}
