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
import { ClinicalProfilesService } from './clinical-profiles.service.js';
import {
  type ClinicalProfileDto,
  clinicalProfileSchema,
} from './schemas/clinical-profile.schema.js';

@ApiTags('medical-records')
@Controller('clinic/medical-records/:patientId/profile')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
export class ClinicalProfilesController {
  constructor(private readonly profiles: ClinicalProfilesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.RECORD_VIEW)
  @ApiOperation({ summary: 'Dados básicos de saúde do paciente' })
  get(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @CurrentUserRole() role: ClinicUserRole,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.profiles.get(clinicId, { id: user.id, role }, patientId);
  }

  @Put()
  @RequirePermissions(PERMISSIONS.RECORD_WRITE)
  @ApiOperation({ summary: 'Atualiza os dados básicos de saúde (valor atual)' })
  update(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @CurrentUserRole() role: ClinicUserRole,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body({ schema: clinicalProfileSchema }) body: ClinicalProfileDto,
  ) {
    return this.profiles.update(
      clinicId,
      { id: user.id, role },
      patientId,
      body,
    );
  }
}
